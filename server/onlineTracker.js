const { run } = require('./db');

const ONLINE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes threshold
const DB_UPDATE_THROTTLE_MS = 2 * 60 * 1000; // Throttle DB writes to once per 2 minutes

// Map<number, { id, name, username, role, access_level, avatar_url, lastSeen, lastDbUpdate }>
const activeUsers = new Map();

// Periodic memory hygiene: purge entries inactive for more than 24 hours
const STALE_PURGE_WINDOW_MS = 24 * 60 * 60 * 1000;
setInterval(() => {
  const cutoff = Date.now() - STALE_PURGE_WINDOW_MS;
  for (const [id, data] of activeUsers.entries()) {
    if (data.lastSeen < cutoff) {
      activeUsers.delete(id);
    }
  }
}, 60 * 60 * 1000).unref();

function touchUser(user) {
  if (!user || !user.id) return;
  const now = Date.now();
  const existing = activeUsers.get(user.id);

  const shouldUpdateDb = !existing || !existing.lastDbUpdate || (now - existing.lastDbUpdate > DB_UPDATE_THROTTLE_MS);

  activeUsers.set(user.id, {
    id: user.id,
    name: user.name || 'Пользователь',
    username: user.username || '',
    role: user.role || 'Участник',
    access_level: user.access_level || 1,
    avatar_url: user.avatar_url || null,
    is_hidden: Boolean(user.is_hidden),
    lastSeen: now,
    lastDbUpdate: shouldUpdateDb ? now : (existing ? existing.lastDbUpdate : now)
  });

  if (shouldUpdateDb) {
    const isoString = new Date(now).toISOString();
    run('UPDATE users SET last_seen_at = ? WHERE id = ?', [isoString, user.id]).catch((err) => {
      console.error('[onlineTracker] Error updating last_seen_at:', err.message);
    });
  }
}

function isUserOnline(userId) {
  if (!userId) return false;
  const entry = activeUsers.get(Number(userId));
  if (!entry) return false;
  return (Date.now() - entry.lastSeen) <= ONLINE_WINDOW_MS;
}

function getOnlineUsers() {
  const now = Date.now();
  const list = [];

  for (const [id, data] of activeUsers.entries()) {
    if (data.is_hidden) continue;
    const diff = now - data.lastSeen;
    if (diff <= ONLINE_WINDOW_MS) {
      let relativeTime = 'Только что';
      const minutesAgo = Math.floor(diff / 60000);
      if (minutesAgo >= 1) {
        relativeTime = `${minutesAgo} мин. назад`;
      }
      list.push({
        id: data.id,
        name: data.name,
        username: data.username,
        role: data.role,
        access_level: data.access_level,
        avatar_url: data.avatar_url,
        last_seen: data.lastSeen,
        relative_time: relativeTime
      });
    }
  }

  // Sort: Level 4 -> Level 3 -> Level 2 -> Level 1, then name ASC
  list.sort((a, b) => {
    if (b.access_level !== a.access_level) {
      return b.access_level - a.access_level;
    }
    return a.name.localeCompare(b.name, 'ru');
  });

  return list;
}

function getOnlineUserIds() {
  return getOnlineUsers().map(u => u.id);
}

function formatLastSeen(dateVal) {
  if (!dateVal) return 'Давно';
  try {
    const d = new Date(dateVal);
    const now = new Date();
    const diffMs = now - d;
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 5) return 'Только что';
    if (diffMinutes < 60) return `${diffMinutes} мин. назад`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24 && d.getDate() === now.getDate()) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `Сегодня в ${hh}:${mm}`;
    }

    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mo} в ${hh}:${mm}`;
  } catch (e) {
    return 'Недавно';
  }
}

module.exports = {
  touchUser,
  isUserOnline,
  getOnlineUsers,
  getOnlineUserIds,
  formatLastSeen,
  ONLINE_WINDOW_MS,
  DB_UPDATE_THROTTLE_MS
};
