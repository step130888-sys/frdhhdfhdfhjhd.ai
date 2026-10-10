const crypto = require('crypto');

// In-memory Telegram auth sessions
// Token -> { token, createdAt, expiresAt, authenticated, userId, user, pendingTg, error }
const sessions = new Map();
const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

function createSession(meta = {}) {
  const token = crypto.randomBytes(16).toString('hex');
  const now = Date.now();
  const session = {
    token,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    authenticated: false,
    userId: null,
    user: null,
    pendingTg: null,
    error: null,
    ...meta
  };
  sessions.set(token, session);
  return session;
}

function getSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function completeSession(token, user) {
  const session = getSession(token);
  if (!session) return false;
  session.authenticated = true;
  session.userId = user.id;
  session.user = user;
  session.error = null;
  return true;
}

function setPendingTg(token, pendingTg) {
  const session = getSession(token);
  if (!session) return false;
  session.pendingTg = pendingTg;
  return true;
}

function setSessionError(token, error) {
  const session = getSession(token);
  if (!session) return false;
  session.error = error;
  return true;
}

function completePendingSessionByTg(chatId, user) {
  if (!chatId || !user) return false;
  const now = Date.now();
  for (const session of sessions.values()) {
    if (session.expiresAt > now && !session.authenticated) {
      if (session.pendingTg && String(session.pendingTg.id) === String(chatId)) {
        session.authenticated = true;
        session.userId = user.id;
        session.user = user;
        session.error = null;
        return true;
      }
    }
  }
  return false;
}

function deleteSession(token) {
  sessions.delete(token);
}

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(token);
    }
  }
}, 60000);

module.exports = {
  createSession,
  getSession,
  completeSession,
  completePendingSessionByTg,
  setPendingTg,
  setSessionError,
  deleteSession
};
