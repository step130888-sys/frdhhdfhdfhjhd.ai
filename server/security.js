/**
 * security.js
 * Security middleware for "СМС СГТУ" platform:
 * 1. Brute-force protection for login (blocks after 3 failed attempts)
 * 2. SQL injection detection and query sanitization
 */

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
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
}

function getAttemptKey(ip, username) {
  const cleanUser = (username || '').trim().toLowerCase();
  return `${ip}::${cleanUser}`;
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

    // Lockout expired, reset
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

    let record = loginAttempts.get(key);
    if (!record || (record.lockedUntil && record.lockedUntil <= now)) {
      record = { count: 0, lockedUntil: null, lastAttempt: now };
    }

    record.count += 1;
    record.lastAttempt = now;

    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
      loginAttempts.set(key, record);
      return {
        locked: true,
        remaining: 0,
        waitMinutes: 15,
        message: 'Превышено количество попыток входа (3 из 3). Доступ временно заблокирован на 15 минут для защиты от перебора паролей.'
      };
    }

    loginAttempts.set(key, record);
    const remaining = MAX_LOGIN_ATTEMPTS - record.count;
    return {
      locked: false,
      remaining,
      message: `Неверный логин или пароль. Осталось попыток: ${remaining} из ${MAX_LOGIN_ATTEMPTS}.`
    };
  },

  recordSuccess(req, username) {
    const ip = getClientIp(req);
    const key = getAttemptKey(ip, username);
    loginAttempts.delete(key);
  },

  // Also support IP-only checking for bot commands (/bind)
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

// High-confidence SQL injection attack patterns
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
  // Check URL query parameters
  if (req.query && scanObjectForSqlInjection(req.query)) {
    console.warn(`[Security] Blocked potential SQL injection in query params from ${req.ip}:`, req.originalUrl);
    return res.status(400).json({
      error: 'Запрос заблокирован системой безопасности: обнаружены недопустимые символы или подозрительный SQL-код.'
    });
  }

  // Check route parameters
  if (req.params && scanObjectForSqlInjection(req.params)) {
    console.warn(`[Security] Blocked potential SQL injection in route params from ${req.ip}:`, req.params);
    return res.status(400).json({
      error: 'Запрос заблокирован системой безопасности: недопустимый параметр маршрута.'
    });
  }

  // Check request body (except file uploads)
  if (req.body && typeof req.body === 'object' && scanObjectForSqlInjection(req.body)) {
    console.warn(`[Security] Blocked potential SQL injection in body from ${req.ip}:`, req.originalUrl);
    return res.status(400).json({
      error: 'Запрос заблокирован системой безопасности: обнаружены недопустимые команды или подозрительный SQL-код.'
    });
  }

  next();
}

module.exports = {
  loginRateLimiter,
  sqlInjectionProtectionMiddleware,
  checkSqlInjectionString
};
