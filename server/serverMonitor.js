const https = require('https');
const net = require('net');

const DEFAULT_PORT = 25565;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_HISTORY = 12;

const IP_PROVIDERS = [
  'https://api.ipify.org?format=text',
  'https://icanhazip.com',
  'https://checkip.amazonaws.com',
  'https://ifconfig.me/ip'
];

const state = {
  ip: null,
  port: DEFAULT_PORT,
  address: null,
  online: false,
  tcp_only: false,
  latency_ms: null,
  mc: null,
  checked_at: null,
  next_check_at: null,
  ip_changed_at: null,
  previous_ip: null,
  interval_ms: CHECK_INTERVAL_MS,
  error: null,
  history: []
};

let monitorTimer = null;
let inFlightPromise = null;

function isValidIPv4(str) {
  if (!str || typeof str !== 'string') return false;
  const parts = str.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

function fetchUrlText(url, timeoutMs = 4500) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        timeout: timeoutMs,
        agent: false, // bypass any HTTP/SOCKS proxy so we observe host's real WAN IP
        headers: { 'User-Agent': 'curl/8.0' }
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let body = '';
        res.on('data', (chunk) => {
          body += chunk.toString('utf8');
          if (body.length > 512) req.destroy();
        });
        res.on('end', () => resolve(body.trim()));
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });
    req.on('error', reject);
  });
}

async function fetchExternalIp() {
  let lastErr = null;
  for (const url of IP_PROVIDERS) {
    try {
      const text = await fetchUrlText(url, 4500);
      if (isValidIPv4(text)) {
        return text.trim();
      }
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Не удалось определить внешний IP сервера');
}

function encodeVarInt(val) {
  const bytes = [];
  let v = val >>> 0;
  do {
    let temp = v & 0x7f;
    v >>>= 7;
    if (v !== 0) temp |= 0x80;
    bytes.push(temp);
  } while (v !== 0);
  return Buffer.from(bytes);
}

function decodeVarInt(buf, offset = 0) {
  let numRead = 0;
  let result = 0;
  while (offset + numRead < buf.length) {
    const read = buf[offset + numRead];
    const value = read & 0x7f;
    result |= value << (7 * numRead);
    numRead++;
    if (numRead > 5) throw new Error('VarInt too big');
    if ((read & 0x80) === 0) {
      return { value: result, length: numRead };
    }
  }
  return null; // incomplete
}

function extractMotdText(description) {
  if (!description) return '';
  if (typeof description === 'string') return description.replace(/§[0-9a-fk-or]/gi, '').trim();
  let text = description.text || '';
  if (Array.isArray(description.extra)) {
    text += description.extra.map((part) => extractMotdText(part)).join('');
  }
  return text.replace(/§[0-9a-fk-or]/gi, '').trim();
}

function buildMinecraftStatusQuery(host, port) {
  const hostBuf = Buffer.from(host, 'utf8');
  const protocolBuf = encodeVarInt(765);
  const hostLenBuf = encodeVarInt(hostBuf.length);
  const portBuf = Buffer.alloc(2);
  portBuf.writeUInt16BE(port, 0);
  const nextStateBuf = encodeVarInt(1);

  const handshakePayload = Buffer.concat([
    Buffer.from([0x00]),
    protocolBuf,
    hostLenBuf,
    hostBuf,
    portBuf,
    nextStateBuf
  ]);
  const handshakePacket = Buffer.concat([
    encodeVarInt(handshakePayload.length),
    handshakePayload
  ]);
  const statusRequestPacket = Buffer.from([0x01, 0x00]);
  return Buffer.concat([handshakePacket, statusRequestPacket]);
}

function pingPort25565(host, port = DEFAULT_PORT, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = new net.Socket();
    let settled = false;
    let connected = false;
    let tcpLatency = null;
    let recvBuf = Buffer.alloc(0);

    const finish = (result) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch (e) {}
      resolve(result);
    };

    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      connected = true;
      tcpLatency = Date.now() - startedAt;
      try {
        socket.write(buildMinecraftStatusQuery(host, port));
      } catch (e) {
        finish({ online: true, tcp_only: true, latency_ms: tcpLatency, mc: null });
      }
    });

    socket.on('data', (chunk) => {
      recvBuf = Buffer.concat([recvBuf, chunk]);
      try {
        const packetLen = decodeVarInt(recvBuf, 0);
        if (!packetLen) return;
        const totalExpected = packetLen.length + packetLen.value;
        if (recvBuf.length < totalExpected) return;

        let cursor = packetLen.length;
        const packetId = decodeVarInt(recvBuf, cursor);
        if (!packetId || packetId.value !== 0x00) {
          return finish({ online: true, tcp_only: true, latency_ms: tcpLatency, mc: null });
        }
        cursor += packetId.length;

        const strLen = decodeVarInt(recvBuf, cursor);
        if (!strLen) return;
        cursor += strLen.length;

        if (recvBuf.length < cursor + strLen.value) return;
        const jsonStr = recvBuf.subarray(cursor, cursor + strLen.value).toString('utf8');
        const statusJson = JSON.parse(jsonStr);

        finish({
          online: true,
          tcp_only: false,
          latency_ms: Math.max(1, tcpLatency ?? (Date.now() - startedAt)),
          mc: {
            version: statusJson.version?.name || null,
            players_online: statusJson.players?.online ?? 0,
            players_max: statusJson.players?.max ?? 0,
            motd: extractMotdText(statusJson.description)
          }
        });
      } catch (e) {
        // Wait for more chunks unless malformed completely; timeout fallback handles non-SLP ports
      }
    });

    socket.on('timeout', () => {
      if (connected) {
        finish({ online: true, tcp_only: true, latency_ms: tcpLatency, mc: null });
      } else {
        finish({ online: false, tcp_only: false, latency_ms: null, mc: null, error: 'Таймаут подключения к порту 25565' });
      }
    });

    socket.on('error', (err) => {
      if (connected) {
        finish({ online: true, tcp_only: true, latency_ms: tcpLatency, mc: null });
      } else {
        finish({ online: false, tcp_only: false, latency_ms: null, mc: null, error: err.message });
      }
    });

    socket.on('close', () => {
      if (!settled) {
        if (connected) {
          finish({ online: true, tcp_only: true, latency_ms: tcpLatency, mc: null });
        } else {
          finish({ online: false, tcp_only: false, latency_ms: null, mc: null, error: 'Соединение закрыто' });
        }
      }
    });
  });
}

async function runCheck() {
  if (inFlightPromise) return inFlightPromise;

  inFlightPromise = (async () => {
    const now = new Date();
    const nowIso = now.toISOString();
    const nextIso = new Date(now.getTime() + CHECK_INTERVAL_MS).toISOString();

    let resolvedIp = state.ip;
    let ipError = null;

    try {
      const freshIp = await fetchExternalIp();
      if (state.ip && state.ip !== freshIp) {
        state.previous_ip = state.ip;
        state.ip_changed_at = nowIso;
      }
      resolvedIp = freshIp;
    } catch (err) {
      ipError = err.message;
    }

    // Ping local 127.0.0.1:25565 first (avoids router NAT hairpinning drops); fallback to public IP if needed
    let pingResult = await pingPort25565('127.0.0.1', DEFAULT_PORT, 2800);
    if (!pingResult.online && resolvedIp) {
      const extPing = await pingPort25565(resolvedIp, DEFAULT_PORT, 2800);
      if (extPing.online) {
        pingResult = extPing;
      }
    }

    state.ip = resolvedIp;
    state.port = DEFAULT_PORT;
    state.address = resolvedIp ? `${resolvedIp}:${DEFAULT_PORT}` : null;
    state.online = Boolean(pingResult.online);
    state.tcp_only = Boolean(pingResult.tcp_only);
    state.latency_ms = pingResult.latency_ms;
    state.mc = pingResult.mc || null;
    state.checked_at = nowIso;
    state.next_check_at = nextIso;
    state.error = ipError || (!pingResult.online ? pingResult.error : null);

    state.history.unshift({
      checked_at: nowIso,
      ip: state.ip,
      address: state.address,
      online: state.online,
      latency_ms: state.latency_ms,
      players_online: state.mc ? state.mc.players_online : null,
      players_max: state.mc ? state.mc.players_max : null
    });
    if (state.history.length > MAX_HISTORY) {
      state.history.length = MAX_HISTORY;
    }

    return getServerStatus();
  })().finally(() => {
    inFlightPromise = null;
  });

  return inFlightPromise;
}

function getServerStatus() {
  return {
    ...state,
    mc: state.mc ? { ...state.mc } : null,
    history: state.history.map((h) => ({ ...h }))
  };
}

function startServerMonitor() {
  if (monitorTimer) return;
  // Initial check shortly after startup so server boots fast
  runCheck().catch((e) => console.error('[ServerMonitor] Initial check error:', e.message));
  monitorTimer = setInterval(() => {
    runCheck().catch((e) => console.error('[ServerMonitor] Periodic check error:', e.message));
  }, CHECK_INTERVAL_MS);
  if (typeof monitorTimer.unref === 'function') {
    monitorTimer.unref();
  }
  console.log('[ServerMonitor] Мониторинг внешнего IP и порта :25565 запущен (интервал: 5 минут).');
}

module.exports = {
  startServerMonitor,
  getServerStatus,
  refreshServerStatus: runCheck
};
