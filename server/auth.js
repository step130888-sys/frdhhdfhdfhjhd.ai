const { get, run, ROOT_ADMIN_USERNAME, setUserCacheInvalidator } = require('./db');
const onlineTracker = require('./onlineTracker');

// In-memory session cache (TTL: 15s)
const userCache = new Map();
const USER_CACHE_TTL_MS = 15000;

function invalidateUserCache(userId) {
  if (userId) {
    userCache.delete(Number(userId));
  } else {
    userCache.clear();
  }
}

if (typeof setUserCacheInvalidator === 'function') {
  setUserCacheInvalidator(invalidateUserCache);
}

async function getCurrentUserMiddleware(req, res, next) {
  req.user = null;

  // Support both cookie and Bearer/Header token (userId)
  let userId = req.cookies ? req.cookies.user_id : null;
  if (!userId && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      userId = authHeader.substring(7).trim();
    }
  }

  if (!userId) {
    return next();
  }

  try {
    const uid = parseInt(userId, 10);
    if (isNaN(uid)) {
      return next();
    }

    const now = Date.now();
    let user = null;
    const cached = userCache.get(uid);

    if (cached && cached.expiresAt > now) {
      user = cached.user;
    } else {
      user = await get('SELECT * FROM users WHERE id = ?', [uid]);
      if (user) {
        // ROOT_ADMIN_USERNAME ('admin') is always Guardian (level 5, approved, role Хранитель)
        if (user.username === ROOT_ADMIN_USERNAME && (user.access_level !== 5 || !user.is_approved || user.role !== 'Хранитель')) {
          user.access_level = 5;
          user.is_approved = 1;
          user.role = 'Хранитель';
          await run("UPDATE users SET access_level = 5, is_approved = 1, role = 'Хранитель' WHERE id = ?", [user.id]);
        }
        userCache.set(uid, { user, expiresAt: now + USER_CACHE_TTL_MS });
      }
    }

    if (!user) {
      return next();
    }

    req.user = user;
    onlineTracker.touchUser(user);
    next();
  } catch (err) {
    console.error('Error in getCurrentUserMiddleware:', err);
    next();
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Пожалуйста, авторизуйтесь в системе.' });
  }
  if (!req.user.is_approved) {
    return res.status(403).json({ error: 'Ваш профиль ожидает одобрения администратором (4 уровень).' });
  }
  next();
}

function requireLevel(minLevel, errorMsg = 'Недостаточно прав.') {
  return (req, res, next) => {
    if (!req.user || req.user.access_level < minLevel) {
      return res.status(403).json({ error: errorMsg });
    }
    next();
  };
}

module.exports = {
  userCache,
  invalidateUserCache,
  getCurrentUserMiddleware,
  requireAuth,
  requireLevel
};
