/**
 * security.js
 * Security middleware & Anti-DDoS / Connection Monitor for "СМС СГТУ" platform:
 * 1. Brute-force protection for login (blocks after 3 failed attempts)
 * 2. SQL injection detection and query sanitization
 * 3. Live Traffic, Connection & Anti-DDoS Monitoring (Level 5 Guardian)
 */

const db = require('./db');

// --------------------------------------------------------------------------
// 1. BRUTE-FORCE PROTECTION (Max 3 failed attempts -> 15 min block)
// --------------------------------------------------------------------------

const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory attempts store: key -> { count: number, lockedUntil: number | null, lastAttempt: number }
const loginAttempts = new Map();

// Periodic cleanup every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts.entries()) {
    if (record.lockedUntil && record.lockedUntil < now) {
      loginAttempts.delete(key);
    } else if (now - record.lastAttempt > LOCKOUT_DURATION_MS * 2) {
      loginAttempts.delete(key);
    }
  }
}, 10 * 60 * 1000);

function getClientIp(req) {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim().replace(/^::ffff:/, '');
  }
  const raw = req.socket?.remoteAddress || req.ip || '127.0.0.1';
  return String(raw).replace(/^::ffff:/, '');
}

function getAttemptKey(ip, username) {
  const cleanUser = (username || '').trim().toLowerCase();
  return `${ip}::${cleanUser}`;
}

// --------------------------------------------------------------------------
// 3. LIVE TRAFFIC, CONNECTION & ANTI-DDOS MONITOR
// --------------------------------------------------------------------------

const DDOS_WARN_RPM = 180;     // >180 req/min from single IP triggers warning
const DDOS_THROTTLE_RPM = 360; // >360 req/min from single IP triggers 429 throttle
const MAX_LIVE_REQUESTS = 250; // Ring buffer size for live feed

const ipStatsMap = new Map(); // ip -> stats object
const bannedIps = new Map();  // ip -> { reason, bannedAt, bannedBy }
const liveRequestsBuffer = []; // Latest HTTP requests
const globalWindowTimestamps = []; // Timestamps of requests in last 60s

let totalRequestsCount = 0;
let totalBlockedCount = 0;
let peakRpm = 0;
const serverStartedAt = new Date().toISOString();

function pruneTimestamps(arr, cutoff) {
  while (arr.length > 0 && arr[0] < cutoff) {
    arr.shift();
  }
}

async function logConnectionEvent({
  ip = '127.0.0.1',
  method = 'GET',
  path = '/',
  status_code = 200,
  user_id = null,
  username = null,
  user_agent = '',
  event_type = 'request',
  details = ''
}) {
  try {
    const nowIso = new Date().toISOString();
    await db.run(
      `INSERT INTO connection_logs (ip, method, path, status_code, user_id, username, user_agent, event_type, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(ip).slice(0, 64),
        String(method).slice(0, 16),
        String(path).slice(0, 300),
        Number(status_code) || 200,
        user_id || null,
        username ? String(username).slice(0, 100) : null,
        String(user_agent || '').slice(0, 300),
        String(event_type).slice(0, 50),
        details ? String(details).slice(0, 1000) : null,
        nowIso
      ]
    );
    // Periodically trim table to keep max 3000 entries
    if (Math.random() < 0.03) {
      await db.run(
        `DELETE FROM connection_logs WHERE id NOT IN (SELECT id FROM connection_logs ORDER BY id DESC LIMIT 3000)`
      );
    }
  } catch (e) {
    // Non-blocking
  }
}

const trafficMonitor = {
  banIp(ip, reason = 'Ручная блокировка Хранителем', bannedBy = 'admin') {
    const cleanIp = String(ip).trim().replace(/^::ffff:/, '');
    bannedIps.set(cleanIp, {
      ip: cleanIp,
      reason,
      bannedAt: new Date().toISOString(),
      bannedBy
    });
    const rec = ipStatsMap.get(cleanIp);
    if (rec) {
      rec.isBanned = true;
      rec.banReason = reason;
    }
  },

  unbanIp(ip) {
    const cleanIp = String(ip).trim().replace(/^::ffff:/, '');
    bannedIps.delete(cleanIp);
    const rec = ipStatsMap.get(cleanIp);
    if (rec) {
      rec.isBanned = false;
      rec.banReason = null;
    }
  },

  isIpBanned(ip) {
    return bannedIps.has(ip);
  },

  getSnapshot() {
    const now = Date.now();
    const oneMinAgo = now - 60000;
    const tenSecAgo = now - 10000;

    pruneTimestamps(globalWindowTimestamps, oneMinAgo);
    const currentRpm = globalWindowTimestamps.length;
    if (currentRpm > peakRpm) peakRpm = currentRpm;

    let recent10s = 0;
    for (let i = globalWindowTimestamps.length - 1; i >= 0; i--) {
      if (globalWindowTimestamps[i] >= tenSecAgo) recent10s++;
      else break;
    }
    const currentRps = Number((recent10s / 10).toFixed(1));

    const ipList = [];
    let suspiciousIpsCount = 0;

    for (const [ip, rec] of ipStatsMap.entries()) {
      pruneTimestamps(rec.timestamps, oneMinAgo);
      const rpm = rec.timestamps.length;
      const isBanned = bannedIps.has(ip);
      const status = isBanned
        ? 'banned'
        : rpm >= DDOS_THROTTLE_RPM
          ? 'critical'
          : rpm >= DDOS_WARN_RPM || rec.blockedCount >= 3
            ? 'warning'
            : 'normal';

      if (status !== 'normal') suspiciousIpsCount++;

      ipList.push({
        ip,
        total_requests: rec.totalRequests,
        rpm,
        blocked_count: rec.blockedCount,
        failed_logins: rec.failedLogins,
        last_seen: rec.lastSeen,
        last_path: rec.lastPath,
        last_method: rec.lastMethod,
        last_status: rec.lastStatus,
        user_id: rec.userId,
        username: rec.username,
        user_name: rec.userName,
        user_agent: rec.userAgent,
        is_banned: isBanned,
        ban_reason: bannedIps.get(ip)?.reason || null,
        status
      });
    }

    ipList.sort((a, b) => {
      if (a.is_banned !== b.is_banned) return a.is_banned ? -1 : 1;
      if (b.rpm !== a.rpm) return b.rpm - a.rpm;
      return b.total_requests - a.total_requests;
    });

    const loadLevel = currentRpm >= 500 || suspiciousIpsCount > 2
      ? 'critical'
      : currentRpm >= 200 || suspiciousIpsCount > 0
        ? 'elevated'
        : 'normal';

    return {
      server_started_at: serverStartedAt,
      uptime_seconds: Math.floor((now - new Date(serverStartedAt).getTime()) / 1000),
      current_rpm: currentRpm,
      requests_per_minute: currentRpm,
      current_rps: currentRps,
      requests_per_second: currentRps,
      peak_rpm: peakRpm,
      total_requests: totalRequestsCount,
      total_blocked: totalBlockedCount,
      blocked_requests: totalBlockedCount,
      unique_ips: ipStatsMap.size,
      active_ips_count: ipStatsMap.size,
      banned_ips_count: bannedIps.size,
      suspicious_ips_count: suspiciousIpsCount,
      load_level: loadLevel,
      ips: ipList.slice(0, 100),
      top_ips: ipList.slice(0, 100),
      banned_ips: Array.from(bannedIps.values()),
      live_requests: liveRequestsBuffer.slice(0, 120),
      recent_requests: liveRequestsBuffer.slice(0, 120)
    };
  }
};

function connectionLoggerMiddleware(req, res, next) {
  // Ignore static assets noise unless it's an API route or page load
  if (req.path.startsWith('/assets/') || req.path.startsWith('/uploads/')) {
    return next();
  }

  const now = Date.now();
  const ip = getClientIp(req);
  const ua = req.headers['user-agent'] || '';

  totalRequestsCount++;
  globalWindowTimestamps.push(now);
  pruneTimestamps(globalWindowTimestamps, now - 60000);
  if (globalWindowTimestamps.length > peakRpm) {
    peakRpm = globalWindowTimestamps.length;
  }

  let rec = ipStatsMap.get(ip);
  if (!rec) {
    rec = {
      ip,
      totalRequests: 0,
      timestamps: [],
      blockedCount: 0,
      failedLogins: 0,
      lastSeen: new Date(now).toISOString(),
      lastPath: req.path,
      lastMethod: req.method,
      lastStatus: 200,
      userId: null,
      username: null,
      userName: null,
      userAgent: ua,
      isBanned: bannedIps.has(ip),
      banReason: bannedIps.get(ip)?.reason || null,
      lastWarnLoggedAt: 0
    };
    ipStatsMap.set(ip, rec);
  }

  rec.totalRequests++;
  rec.timestamps.push(now);
  pruneTimestamps(rec.timestamps, now - 60000);
  rec.lastSeen = new Date(now).toISOString();
  rec.lastPath = req.originalUrl || req.path;
  rec.lastMethod = req.method;
  if (ua) rec.userAgent = ua;
  if (req.user) {
    rec.userId = req.user.id;
    rec.username = req.user.username;
    rec.userName = req.user.name;
  }

  // 1. Check manual IP ban (do not block localhost or Level 5 Guardian)
  const isLocal = ip === '127.0.0.1' || ip === '::1';
  const isGuardianUser = req.user && req.user.access_level >= 5;
  if (bannedIps.has(ip) && !isLocal && !isGuardianUser) {
    rec.blockedCount++;
    totalBlockedCount++;
    const banInfo = bannedIps.get(ip);
    logConnectionEvent({
      ip,
      method: req.method,
      path: req.originalUrl || req.path,
      status_code: 403,
      user_id: req.user?.id,
      username: req.user?.username,
      user_agent: ua,
      event_type: 'banned_blocked',
      details: `Отклонен запрос с заблокированного IP (${banInfo?.reason || 'Бан'})`
    });
    return res.status(403).json({
      error: 'Доступ с вашего IP-адреса ограничен системой защиты СМС СГТУ.'
    });
  }

  // 2. Check DDoS / Flood threshold
  const rpm = rec.timestamps.length;
  if (rpm >= DDOS_THROTTLE_RPM && !isLocal && !isGuardianUser) {
    rec.blockedCount++;
    totalBlockedCount++;
    if (now - rec.lastWarnLoggedAt > 15000) {
      rec.lastWarnLoggedAt = now;
      logConnectionEvent({
        ip,
        method: req.method,
        path: req.originalUrl || req.path,
        status_code: 429,
        user_id: req.user?.id,
        username: req.user?.username,
        user_agent: ua,
        event_type: 'ddos_throttled',
        details: `Анти-DDoS блокировка: превышен лимит запросов (${rpm} запр./мин с одного IP)`
      });
    }
    return res.status(429).json({
      error: 'Слишком много запросов с вашего IP-адреса. Пожалуйста, подождите минуту.'
    });
  } else if (rpm >= DDOS_WARN_RPM && now - rec.lastWarnLoggedAt > 30000) {
    rec.lastWarnLoggedAt = now;
    logConnectionEvent({
      ip,
      method: req.method,
      path: req.originalUrl || req.path,
      status_code: 200,
      user_id: req.user?.id,
      username: req.user?.username,
      user_agent: ua,
      event_type: 'ddos_warning',
      details: `Подозрительная активность: высокая частота запросов (${rpm} запр./мин)`
    });
  }

  const startHr = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startHr) / 1e6;
    const status = res.statusCode;
    rec.lastStatus = status;
    if (req.user) {
      rec.userId = req.user.id;
      rec.username = req.user.username;
      rec.userName = req.user.name;
    }

    // Ignore routine heartbeat polling from cluttering the live feed unless it failed
    const isHeartbeat = req.path === '/api/online/heartbeat' || req.path === '/api/online/users';
    if (!isHeartbeat || status >= 400) {
      liveRequestsBuffer.unshift({
        id: `${now}-${Math.random().toString(36).slice(2, 6)}`,
        ip,
        method: req.method,
        path: req.originalUrl || req.path,
        status_code: status,
        duration_ms: Math.round(durationMs),
        user_id: req.user?.id || null,
        username: req.user?.username || null,
        user_name: req.user?.name || null,
        user_agent: ua,
        created_at: new Date().toISOString()
      });
      if (liveRequestsBuffer.length > MAX_LIVE_REQUESTS) {
        liveRequestsBuffer.pop();
      }
    }

    // Persist important API calls or errors to connection_logs
    const isMutatingApi = req.path.startsWith('/api/') && req.method !== 'GET' && !isHeartbeat;
    const isErrorStatus = status >= 400 && req.path.startsWith('/api/');
    if ((isMutatingApi || isErrorStatus) && !req.path.startsWith('/api/auth/login')) {
      logConnectionEvent({
        ip,
        method: req.method,
        path: req.originalUrl || req.path,
        status_code: status,
        user_id: req.user?.id,
        username: req.user?.username,
        user_agent: ua,
        event_type: status >= 400 ? 'http_error' : 'api_action',
        details: `${req.method} ${req.path} → HTTP ${status} (${Math.round(durationMs)} мс)`
      });
    }
  });

  next();
}

const loginRateLimiter = {
  check(req, username) {
    const ip = getClientIp(req);
    const key = getAttemptKey(ip, username);
    const now = Date.now();

    const record = loginAttempts.get(key);
    if (!record) {
      return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };
    }

    if (record.lockedUntil && record.lockedUntil > now) {
      const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      const waitMinutes = Math.ceil(waitSeconds / 60);
      return {
        allowed: false,
        locked: true,
        waitSeconds,
        waitMinutes,
        message: `Превышено количество попыток входа (3 из 3). Вход заблокирован на 15 минут для защиты от перебора паролей. Попробуйте снова через ${waitMinutes} мин.`
      };
    }

    if (record.lockedUntil && record.lockedUntil <= now) {
      loginAttempts.delete(key);
      return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };
    }

    const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - record.count);
    return { allowed: remaining > 0, remaining };
  },

  recordFailure(req, username) {
    const ip = getClientIp(req);
    const key = getAttemptKey(ip, username);
    const now = Date.now();

    const ipRec = ipStatsMap.get(ip);
    if (ipRec) {
      ipRec.failedLogins++;
      ipRec.blockedCount++;
    }
    totalBlockedCount++;

    let record = loginAttempts.get(key);
    if (!record || (record.lockedUntil && record.lockedUntil <= now)) {
      record = { count: 0, lockedUntil: null, lastAttempt: now };
    }

    record.count += 1;
    record.lastAttempt = now;

    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
      loginAttempts.set(key, record);
      logConnectionEvent({
        ip,
        method: 'POST',
        path: '/api/auth/login',
        status_code: 429,
        username,
        user_agent: req.headers?.['user-agent'] || '',
        event_type: 'bruteforce_lock',
        details: `Блокировка входа на 15 мин после 3 неудачных попыток (логин: ${username})`
      });
      return {
        locked: true,
        remaining: 0,
        waitMinutes: 15,
        message: 'Превышено количество попыток входа (3 из 3). Доступ временно заблокирован на 15 минут для защиты от перебора паролей.'
      };
    }

    loginAttempts.set(key, record);
    const remaining = MAX_LOGIN_ATTEMPTS - record.count;
    logConnectionEvent({
      ip,
      method: 'POST',
      path: '/api/auth/login',
      status_code: 401,
      username,
      user_agent: req.headers?.['user-agent'] || '',
      event_type: 'login_failed',
      details: `Неудачная попытка входа (логин: ${username}, осталось попыток: ${remaining})`
    });
    return {
      locked: false,
      remaining,
      message: `Неверный логин или пароль. Осталось попыток: ${remaining} из ${MAX_LOGIN_ATTEMPTS}.`
    };
  },

  recordSuccess(req, username, userId = null) {
    const ip = getClientIp(req);
    const key = getAttemptKey(ip, username);
    loginAttempts.delete(key);
    logConnectionEvent({
      ip,
      method: 'POST',
      path: '/api/auth/login',
      status_code: 200,
      user_id: userId,
      username,
      user_agent: req.headers?.['user-agent'] || '',
      event_type: 'login_success',
      details: `Успешная авторизация пользователя @${username}`
    });
  },

  checkBotAttempt(identifier) {
    const key = `bot::${identifier}`;
    const now = Date.now();
    const record = loginAttempts.get(key);
    if (!record) return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };

    if (record.lockedUntil && record.lockedUntil > now) {
      const waitMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      return {
        allowed: false,
        message: `⚠️ Превышено число попыток входа (3). Блокировка на 15 минут. Попробуйте через ${waitMinutes} мин.`
      };
    }
    if (record.lockedUntil && record.lockedUntil <= now) {
      loginAttempts.delete(key);
      return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };
    }
    const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - record.count);
    return { allowed: remaining > 0, remaining };
  },

  recordBotFailure(identifier) {
    const key = `bot::${identifier}`;
    const now = Date.now();
    let record = loginAttempts.get(key) || { count: 0, lockedUntil: null, lastAttempt: now };
    record.count += 1;
    record.lastAttempt = now;

    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
      loginAttempts.set(key, record);
      return {
        locked: true,
        message: '⚠️ Превышено 3 попытки ввода пароля. Аккаунт временно заблокирован на 15 минут.'
      };
    }
    loginAttempts.set(key, record);
    return {
      locked: false,
      remaining: MAX_LOGIN_ATTEMPTS - record.count,
      message: `⚠️ Неверный логин или пароль. Осталось попыток: ${MAX_LOGIN_ATTEMPTS - record.count} из 3.`
    };
  },

  recordBotSuccess(identifier) {
    loginAttempts.delete(`bot::${identifier}`);
  }
};

// --------------------------------------------------------------------------
// 2. SQL INJECTION DEFENSE (Middleware & Pattern Guard)
// --------------------------------------------------------------------------

const SQLI_PATTERNS = [
  /(\b(union(\s+all)?)\s+select\b)/i,
  /(\bselect\b.+\bfrom\b.+\bwhere\b)/i,
  /(\bdrop\s+(table|database|view|index)\b)/i,
  /(\btruncate\s+table\b)/i,
  /(\balter\s+table\b)/i,
  /(\bexec(ute)?\s*\()/i,
  /(\b(benchmark|sleep)\s*\(\s*\d+\s*\))/i,
  /('.+--)/,
  /(--\s*$)/,
  /(;\s*(drop|alter|delete|update|insert)\b)/i,
  /('\s*or\s*'1'\s*=\s*'1')/i,
  /('\s*or\s*1\s*=\s*1)/i,
  /("\s*or\s*"1"\s*=\s*"1")/i,
  /("\s*or\s*1\s*=\s*1)/i,
  /(\b(or|and)\b\s+\d+\s*=\s*\d+)/i,
  /(\bload_file\s*\()/i,
  /(\binto\s+(out|dump)file\b)/i
];

function checkSqlInjectionString(val) {
  if (typeof val !== 'string') return false;
  const str = val.trim();
  if (str.length < 5) return false;

  for (const pattern of SQLI_PATTERNS) {
    if (pattern.test(str)) {
      return true;
    }
  }
  return false;
}

function scanObjectForSqlInjection(obj, depth = 0) {
  if (!obj || depth > 4) return false;
  if (typeof obj === 'string') {
    return checkSqlInjectionString(obj);
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (scanObjectForSqlInjection(item, depth + 1)) return true;
    }
    return false;
  }
  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (checkSqlInjectionString(key)) return true;
      if (scanObjectForSqlInjection(value, depth + 1)) return true;
    }
  }
  return false;
}

function sqlInjectionProtectionMiddleware(req, res, next) {
  const ip = getClientIp(req);
  const ua = req.headers?.['user-agent'] || '';

  if (req.query && scanObjectForSqlInjection(req.query)) {
    totalBlockedCount++;
    const rec = ipStatsMap.get(ip);
    if (rec) rec.blockedCount++;
    console.warn(`[Security] Blocked potential SQL injection in query params from ${ip}:`, req.originalUrl);
    logConnectionEvent({
      ip,
      method: req.method,
      path: req.originalUrl || req.path,
      status_code: 400,
      user_agent: ua,
      event_type: 'sqli_blocked',
      details: `Заблокирована попытка SQL-инъекции в query-параметрах: ${req.originalUrl}`
    });
    return res.status(400).json({
      error: 'Запрос заблокирован системой безопасности: обнаружены недопустимые символы или подозрительный SQL-код.'
    });
  }

  if (req.params && scanObjectForSqlInjection(req.params)) {
    totalBlockedCount++;
    const rec = ipStatsMap.get(ip);
    if (rec) rec.blockedCount++;
    console.warn(`[Security] Blocked potential SQL injection in route params from ${ip}:`, req.params);
    logConnectionEvent({
      ip,
      method: req.method,
      path: req.originalUrl || req.path,
      status_code: 400,
      user_agent: ua,
      event_type: 'sqli_blocked',
      details: `Заблокирована попытка SQL-инъекции в параметрах маршрута`
    });
    return res.status(400).json({
      error: 'Запрос заблокирован системой безопасности: недопустимый параметр маршрута.'
    });
  }

  if (req.body && typeof req.body === 'object' && scanObjectForSqlInjection(req.body)) {
    totalBlockedCount++;
    const rec = ipStatsMap.get(ip);
    if (rec) rec.blockedCount++;
    console.warn(`[Security] Blocked potential SQL injection in body from ${ip}:`, req.originalUrl);
    logConnectionEvent({
      ip,
      method: req.method,
      path: req.originalUrl || req.path,
      status_code: 400,
      user_agent: ua,
      event_type: 'sqli_blocked',
      details: `Заблокирована попытка SQL-инъекции в теле запроса: ${req.originalUrl}`
    });
    return res.status(400).json({
      error: 'Запрос заблокирован системой безопасности: обнаружены недопустимые команды или подозрительный SQL-код.'
    });
  }

  next();
}

module.exports = {
  getClientIp,
  loginRateLimiter,
  sqlInjectionProtectionMiddleware,
  checkSqlInjectionString,
  trafficMonitor,
  connectionLoggerMiddleware,
  logConnectionEvent
};
