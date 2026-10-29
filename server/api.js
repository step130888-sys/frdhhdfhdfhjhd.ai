const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const { requireAuth, requireLevel, invalidateUserCache } = require('./auth');
const onlineTracker = require('./onlineTracker');
const telegramService = require('./telegramService');
const vkService = require('./vkService');
const gdriveService = require('./gdriveService');
const telegramAuth = require('./telegramAuth');
const { loginRateLimiter, getClientIp, trafficMonitor, logConnectionEvent } = require('./security');
const secretVault = require('./secretVault');

// Multer storage configuration
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'file-' + unique + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB limit
});

// Helpers for multi-direction support (e.g. "Фото, Дизайн")
function getUserDirections(u) {
  if (!u) return [];
  const roleStr = typeof u === 'string' ? u : (u.role || '');
  return roleStr.split(',').map(s => s.trim()).filter(Boolean);
}

function userHasDirection(u, dir) {
  if (!u || !dir) return false;
  const dirs = getUserDirections(u).map(d => d.toLowerCase());
  return dirs.includes(dir.trim().toLowerCase());
}

function hasMatchingDirection(userA, userB) {
  if (!userA || !userB) return false;
  const dirsA = getUserDirections(userA).map(d => d.toLowerCase());
  const dirsB = getUserDirections(userB).map(d => d.toLowerCase());
  return dirsA.some(d => dirsB.includes(d));
}

// Helper for wrapping dict for compatibility
function wrapUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    roles: getUserDirections(u),
    access_level: u.access_level,
    is_approved: Boolean(u.is_approved),
    is_hidden: Boolean(u.is_hidden),
    can_create_tasks: Boolean(u.can_create_tasks),
    completed_tasks: u.completed_tasks || 0,
    average_score: Number((u.average_score || 0).toFixed(1)),
    avatar_url: u.avatar_url || null,
    telegram_id: u.telegram_id || null,
    vk_id: u.vk_id || null,
    last_seen_at: u.last_seen_at || null,
    is_online: onlineTracker.isUserOnline(u.id),
    last_seen_formatted: onlineTracker.formatLastSeen(u.last_seen_at)
  };
}

async function logAudit(req, { action, category = 'system', target = '', details = '', overrideUser = null }) {
  try {
    const actor = overrideUser || req?.user || null;
    const ip = getClientIp(req);
    const nowIso = new Date().toISOString();
    await db.run(
      `INSERT INTO audit_logs (user_id, username, user_name, user_level, action, category, target, details, ip, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actor?.id || null,
        actor?.username || null,
        actor?.name || 'Система',
        actor?.access_level || 0,
        String(action || 'Действие').slice(0, 80),
        String(category || 'system').slice(0, 50),
        String(target || '').slice(0, 200),
        String(details || '').slice(0, 2000),
        String(ip || '127.0.0.1').slice(0, 64),
        nowIso
      ]
    );
    if (Math.random() < 0.03) {
      await db.run(`DELETE FROM audit_logs WHERE id NOT IN (SELECT id FROM audit_logs ORDER BY id DESC LIMIT 3000)`);
    }
  } catch (e) {
    console.error('[AuditLog] Error:', e.message);
  }
}

// --------------------------------------------------------------------------
// 1. AUTHENTICATION & SESSION ROUTES
// --------------------------------------------------------------------------

router.post('/auth/login', async (req, res) => {
  const username = (req.body.username || '').trim().toLowerCase();
  const password = (req.body.password || '').trim();

  if (!username || !password) {
    return res.status(400).json({ error: 'Укажите логин и пароль.' });
  }

  // 1. Check brute-force rate limit (max 3 failed attempts)
  const rateCheck = loginRateLimiter.check(req, username);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: rateCheck.message,
      locked: true,
      waitMinutes: rateCheck.waitMinutes
    });
  }

  const user = await db.get('SELECT * FROM users WHERE LOWER(username) = ?', [username]);

  if (!user || !db.verifyPassword(password, user.password_hash)) {
    const failureResult = loginRateLimiter.recordFailure(req, username);
    const status = failureResult.locked ? 429 : 401;
    await logAudit(req, {
      action: failureResult.locked ? 'Блокировка входа (Brute-force)' : 'Неудачный вход',
      category: 'auth',
      target: `@${username}`,
      details: failureResult.locked
        ? `Аккаунт @${username} временно заблокирован на 15 мин после 3 неверных попыток ввода пароля`
        : `Неверный логин или пароль при попытке входа под @${username}`
    });
    return res.status(status).json({
      error: failureResult.message,
      locked: failureResult.locked,
      remaining: failureResult.remaining
    });
  }

  // Login successful: reset failed attempts counter
  loginRateLimiter.recordSuccess(req, username, user.id);

  if (!user.is_approved) {
    return res.status(403).json({
      error: 'Ваш профиль ожидает одобрения главным администратором (4 уровень). Доступ откроется после подтверждения.'
    });
  }

  const remember = req.body.remember_me !== false && req.body.remember_me !== 'false';
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  };
  if (remember) {
    cookieOptions.maxAge = 90 * 24 * 60 * 60 * 1000;
  }
  res.cookie('user_id', String(user.id), cookieOptions);

  onlineTracker.touchUser(user);
  await logAudit(req, {
    action: 'Вход в систему',
    category: 'auth',
    target: `@${user.username}`,
    details: `Пользователь ${user.name} (@${user.username}, ${user.access_level} ур.) вошел в систему`,
    overrideUser: user
  });

  res.json({
    success: true,
    user: wrapUser(user),
    token: String(user.id)
  });
});

router.post('/auth/register', async (req, res) => {
  const name = (req.body.name || '').trim();
  const username = (req.body.username || '').trim().toLowerCase();
  const password = (req.body.password || '').trim();
  const telegramId = (req.body.telegram_id || '').trim();

  let role = '';
  if (Array.isArray(req.body.roles) && req.body.roles.length > 0) {
    role = req.body.roles.map(r => String(r).trim()).filter(Boolean).join(', ');
  } else if (Array.isArray(req.body.role)) {
    role = req.body.role.map(r => String(r).trim()).filter(Boolean).join(', ');
  } else if (typeof req.body.role === 'string') {
    role = req.body.role.trim();
  }

  if (!name || !username || !password || !role) {
    return res.status(400).json({ error: 'Все обязательные поля (ФИО, логин, пароль, как минимум одно направление) должны быть заполнены.' });
  }

  const existing = await db.get('SELECT id FROM users WHERE LOWER(username) = ?', [username]);
  if (existing) {
    return res.status(400).json({ error: `Логин '${username}' уже занят. Пожалуйста, выберите другой.` });
  }

  const passwordHash = db.hashPassword(password);
  const result = await db.run(
    `INSERT INTO users (name, username, password_hash, telegram_id, role, access_level, is_approved, completed_tasks, average_score)
     VALUES (?, ?, ?, ?, ?, 1, 0, 0, 0.0)`,
    [name, username, passwordHash, telegramId || null, role]
  );

  const newUser = await db.get('SELECT * FROM users WHERE id = ?', [result.lastID]);
  await logAudit(req, {
    action: 'Заявка на регистрацию',
    category: 'auth',
    target: `@${username}`,
    details: `Создана заявка на регистрацию: ${name} (@${username}), цех: ${role} (1 ур. — Стажёр)`,
    overrideUser: newUser
  });

  try {
    await telegramService.notifyNewUserRegistered(newUser);
  } catch (e) {
    console.error('Error notifying new user registration:', e);
  }

  res.json({
    success: true,
    message: 'Заявка успешно отправлена! Главный администратор (4 уровень) рассмотрит ее в специальной ветке модерации.'
  });
});

router.post('/auth/logout', async (req, res) => {
  if (req.user) {
    await logAudit(req, {
      action: 'Выход из системы',
      category: 'auth',
      target: `@${req.user.username}`,
      details: `Пользователь ${req.user.name} (@${req.user.username}) вышел из системы`
    });
  }
  res.clearCookie('user_id');
  res.json({ success: true });
});

router.get('/auth/me', (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  res.json({
    user: wrapUser(req.user),
    online_count: onlineTracker.getOnlineUsers().length
  });
});

// --------------------------------------------------------------------------
// 1.1 1-CLICK TELEGRAM AUTHENTICATION
// --------------------------------------------------------------------------

router.get('/auth/telegram-info', (req, res) => {
  const botUsername = telegramService.getBotUsername ? telegramService.getBotUsername() : 'ping_sstu_bot';
  res.json({
    botUsername,
    botId: '8837250732'
  });
});

router.post('/auth/telegram-session', (req, res) => {
  const session = telegramAuth.createSession();
  const botUsername = telegramService.getBotUsername ? telegramService.getBotUsername() : 'ping_sstu_bot';
  res.json({
    token: session.token,
    botUsername,
    deepLink: `https://t.me/${botUsername}?start=login_${session.token}`,
    expiresAt: session.expiresAt
  });
});

router.get('/auth/telegram-session/:token', async (req, res) => {
  const token = req.params.token;
  const session = telegramAuth.getSession(token);
  if (!session) {
    return res.status(404).json({ error: 'Сессия входа истекла или не найдена.' });
  }

  if (session.authenticated && session.userId) {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [session.userId]);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден.' });
    }
    res.cookie('user_id', String(user.id), {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    onlineTracker.touchUser(user);
    return res.json({
      authenticated: true,
      user: wrapUser(user)
    });
  }

  if (session.error) {
    return res.json({
      authenticated: false,
      error: session.error
    });
  }

  if (session.pendingTg) {
    return res.json({
      authenticated: false,
      pendingTg: session.pendingTg
    });
  }

  return res.json({
    authenticated: false,
    pending: true
  });
});

router.post('/auth/telegram-session/:token/bind-and-login', async (req, res) => {
  const token = req.params.token;
  const session = telegramAuth.getSession(token);
  if (!session) {
    return res.status(404).json({ error: 'Сессия входа истекла.' });
  }

  const username = (req.body.username || '').trim().toLowerCase();
  const password = (req.body.password || '').trim();

  if (!username || !password) {
    return res.status(400).json({ error: 'Укажите логин и пароль.' });
  }

  // Brute-force check
  const rateCheck = loginRateLimiter.check(req, username);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: rateCheck.message, locked: true });
  }

  const user = await db.get('SELECT * FROM users WHERE LOWER(username) = ?', [username]);
  if (!user || !db.verifyPassword(password, user.password_hash)) {
    const failureResult = loginRateLimiter.recordFailure(req, username);
    return res.status(failureResult.locked ? 429 : 401).json({ error: failureResult.message });
  }

  loginRateLimiter.recordSuccess(req, username);

  if (!user.is_approved) {
    return res.status(403).json({ error: 'Ваш профиль ожидает одобрения администратором.' });
  }

  if (session.pendingTg && session.pendingTg.id) {
    await db.run('UPDATE users SET telegram_id = ? WHERE id = ?', [String(session.pendingTg.id), user.id]);
    invalidateUserCache(user.id);
  }

  telegramAuth.completeSession(token, user);

  res.cookie('user_id', String(user.id), {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  onlineTracker.touchUser(user);

  res.json({
    success: true,
    user: wrapUser(user)
  });
});

router.post('/auth/telegram-quick-login', async (req, res) => {
  const identifier = (req.body.identifier || '').trim();
  if (!identifier) {
    return res.status(400).json({ error: 'Укажите Telegram ID, username или логин.' });
  }
  const clean = identifier.replace('@', '').toLowerCase();
  const user = await db.get(
    'SELECT * FROM users WHERE telegram_id = ? OR telegram_id = ? OR LOWER(telegram_id) = ? OR LOWER(telegram_id) = ? OR LOWER(username) = ?',
    [identifier, clean, '@' + clean, clean, clean]
  );
  if (!user) {
    return res.status(404).json({ error: `Профиль для «${identifier}» не найден.` });
  }
  if (!user.is_approved) {
    return res.status(403).json({ error: 'Ваш профиль ожидает одобрения администратором.' });
  }

  res.cookie('user_id', String(user.id), {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  onlineTracker.touchUser(user);

  res.json({
    success: true,
    user: wrapUser(user)
  });
});

// --------------------------------------------------------------------------
// 2. ONLINE TRACKING
// --------------------------------------------------------------------------

router.get('/online/users', (req, res) => {
  const users = onlineTracker.getOnlineUsers();
  res.json({ users, count: users.length });
});

router.post('/online/heartbeat', (req, res) => {
  if (req.user) {
    onlineTracker.touchUser(req.user);
  }
  res.json({ success: true });
});

// --------------------------------------------------------------------------
// 3. USER MANAGEMENT & PROFILES
// --------------------------------------------------------------------------

router.get('/users', requireAuth, async (req, res) => {
  const sql = `
    SELECT u.*, COALESCE(tc.active_count, 0) AS active_tasks_count
    FROM users u
    LEFT JOIN (
      SELECT assigned_to_id, COUNT(*) AS active_count
      FROM tasks
      WHERE status IN ('in_progress', 'rework')
      GROUP BY assigned_to_id
    ) tc ON u.id = tc.assigned_to_id
    WHERE u.is_approved = 1 AND (u.is_hidden IS NULL OR u.is_hidden = 0)
    ORDER BY u.role ASC, u.name ASC
  `;
  const users = await db.all(sql);
  res.json(users.map(u => ({
    ...wrapUser(u),
    active_tasks_count: u.active_tasks_count || 0
  })));
});

router.get('/users/:id', requireAuth, async (req, res) => {
  const profileId = parseInt(req.params.id, 10);
  const profileUser = await db.get('SELECT * FROM users WHERE id = ?', [profileId]);

  if (!profileUser) {
    return res.status(404).json({ error: 'Пользователь не найден.' });
  }

  // Hidden profiles are accessible only in moderation panel / by admins (level >= 4) or the user themselves
  if (profileUser.is_hidden && req.user.access_level < 4 && req.user.id !== profileUser.id) {
    return res.status(404).json({ error: 'Пользователь не найден.' });
  }

  // Single fast query eliminating N+1 for tasks + reviewer info + comment count
  const userTasks = await db.all(`
    SELECT t.*,
           g.name AS grader_name, g.role AS grader_role,
           (SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id) AS comment_count
    FROM tasks t
    LEFT JOIN users g ON t.graded_by_id = g.id
    WHERE t.assigned_to_id = ?
    ORDER BY t.id DESC
  `, [profileId]);

  let inProgressCount = 0;
  let reviewCount = 0;
  for (const t of userTasks) {
    if (t.graded_by_id && t.grader_name) {
      t.graded_by = { id: t.graded_by_id, name: t.grader_name, role: t.grader_role };
    } else {
      t.graded_by = null;
    }
    t.comments_count = t.comment_count;
    if (t.status === 'in_progress') inProgressCount++;
    else if (t.status === 'review') reviewCount++;
  }

  // Open tasks available for forced assignment
  let openTasksQuery = 'SELECT * FROM tasks WHERE status = "open"';
  const openTasksParams = [];
  if (req.user.access_level <= 2) {
    const profileDirs = getUserDirections(profileUser);
    if (profileDirs.length > 0) {
      const placeholders = profileDirs.map(() => '?').join(', ');
      openTasksQuery += ` AND direction IN (${placeholders})`;
      openTasksParams.push(...profileDirs);
    }
  }
  openTasksQuery += ` ORDER BY 
    CASE WHEN deadline IS NOT NULL AND TRIM(deadline) != '' THEN 0 ELSE 1 END ASC,
    deadline ASC, id DESC`;
  const openTasks = await db.all(openTasksQuery, openTasksParams);

  res.json({
    user: wrapUser(profileUser),
    tasks: userTasks,
    open_tasks: openTasks,
    in_progress_count: inProgressCount,
    review_count: reviewCount
  });
});

router.post('/users/:id/update', requireAuth, async (req, res) => {
  const profileId = parseInt(req.params.id, 10);
  const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [profileId]);

  if (!targetUser) {
    return res.status(404).json({ error: 'Пользователь не найден.' });
  }

  const isSelf = (req.user.id === profileId);
  const isLeaderOrAdmin = (req.user.access_level >= 3);
  const isAdmin = (req.user.access_level >= 4);
  const isGuardian = (req.user.access_level >= 5);
  const isRootGuardian = (req.user.username === db.ROOT_ADMIN_USERNAME);

  if (!isSelf && !isLeaderOrAdmin) {
    return res.status(403).json({ error: 'Недостаточно прав для редактирования профиля.' });
  }

  // Strict protection for Root Guardian ('admin'): nobody can edit 'admin' except himself
  if (targetUser.username === db.ROOT_ADMIN_USERNAME && !isSelf) {
    return res.status(403).json({
      error: 'Доступ запрещен. Системный профиль Root-Хранителя (admin) может изменять только он сам.'
    });
  }

  // Other Level 5 (Хранитель) users can ONLY be edited by themselves OR by Root Guardian ('admin')
  if (targetUser.access_level >= 5 && !isSelf && !isRootGuardian) {
    return res.status(403).json({
      error: 'Доступ запрещен. Изменять профиль, пароль или статус другого Хранителя может только Root-Хранитель (admin).'
    });
  }

  // Non-root administrators cannot edit a user with higher access level
  if (targetUser.access_level > req.user.access_level && !isSelf && !isRootGuardian) {
    return res.status(403).json({
      error: 'Вы не можете редактировать профиль пользователя с более высоким уровнем доступа.'
    });
  }

  // Non-root administrators cannot change the password of another user with equal or higher access level
  if (req.body.password && targetUser.access_level >= req.user.access_level && !isSelf && !isRootGuardian) {
    return res.status(403).json({
      error: 'Вы не можете изменять пароль пользователя с равным или более высоким уровнем доступа.'
    });
  }

  const name = req.body.name ? req.body.name.trim() : null;
  const username = req.body.username ? req.body.username.trim().toLowerCase() : null;
  const role = req.body.role ? req.body.role.trim() : null;
  const password = req.body.password ? req.body.password.trim() : null;
  const accessLevel = req.body.access_level !== undefined ? parseInt(req.body.access_level, 10) : null;
  const canCreateTasks = req.body.can_create_tasks !== undefined ? (req.body.can_create_tasks ? 1 : 0) : null;

  let newName = targetUser.name;
  let newUsername = targetUser.username;
  let newRole = targetUser.role;
  let newHash = targetUser.password_hash;
  let newLevel = targetUser.access_level;
  let newCanCreate = targetUser.can_create_tasks;

  if (name) newName = name;

  let rolesInput = null;
  if (Array.isArray(req.body.roles) && req.body.roles.length > 0) {
    rolesInput = req.body.roles.map(r => String(r).trim()).filter(Boolean).join(', ');
  } else if (Array.isArray(req.body.role)) {
    rolesInput = req.body.role.map(r => String(r).trim()).filter(Boolean).join(', ');
  } else if (typeof req.body.role === 'string' && req.body.role.trim()) {
    rolesInput = req.body.role.trim();
  }
  if (rolesInput) newRole = rolesInput;

  if (password) newHash = db.hashPassword(password);

  if (username && username !== targetUser.username) {
    if (targetUser.username === db.ROOT_ADMIN_USERNAME) {
      // Cannot rename root admin
    } else {
      const existing = await db.get('SELECT id FROM users WHERE LOWER(username) = ? AND id != ?', [username, profileId]);
      if (existing) {
        return res.status(400).json({ error: `Логин '${username}' уже занят другим пользователем.` });
      }
      newUsername = username;
    }
  }

  if (isLeaderOrAdmin && accessLevel !== null && !isNaN(accessLevel)) {
    if (targetUser.username === db.ROOT_ADMIN_USERNAME) {
      newLevel = 5; // Immutable protection for root admin (Хранитель)
    } else {
      const maxAllowed = isGuardian ? 5 : (isAdmin ? 4 : 3);
      newLevel = Math.max(1, Math.min(maxAllowed, accessLevel));
    }
  }

  // If Root Guardian demoted another Guardian from level 5 and role was still 'Хранитель', adjust role automatically
  if (targetUser.access_level >= 5 && newLevel < 5 && newRole === 'Хранитель') {
    newRole = newLevel >= 3 ? 'Руководство' : 'Фото';
  }

  if (isLeaderOrAdmin && canCreateTasks !== null) {
    newCanCreate = canCreateTasks;
  }

  let newIsHidden = targetUser.is_hidden || 0;
  if (isAdmin && typeof req.body.is_hidden !== 'undefined') {
    newIsHidden = req.body.is_hidden ? 1 : 0;
  }

  await db.run(
    `UPDATE users SET name = ?, username = ?, role = ?, password_hash = ?, access_level = ?, can_create_tasks = ?, is_hidden = ? WHERE id = ?`,
    [newName, newUsername, newRole, newHash, newLevel, newCanCreate, newIsHidden, profileId]
  );
  invalidateUserCache(profileId);

  const changesList = [];
  if (newName !== targetUser.name) changesList.push(`ФИО: «${targetUser.name}» → «${newName}»`);
  if (newUsername !== targetUser.username) changesList.push(`Логин: @${targetUser.username} → @${newUsername}`);
  if (newRole !== targetUser.role) changesList.push(`Цех: ${targetUser.role} → ${newRole}`);
  if (newLevel !== targetUser.access_level) {
    if (targetUser.access_level >= 5 && newLevel < 5) {
      changesList.push(`Снят статус Хранителя (уровень: ${targetUser.access_level} → ${newLevel})`);
    } else {
      changesList.push(`Уровень доступа: ${targetUser.access_level} → ${newLevel}`);
    }
  }
  if (password) changesList.push('Изменён пароль');
  if (Boolean(newCanCreate) !== Boolean(targetUser.can_create_tasks)) {
    changesList.push(`Создание задач: ${newCanCreate ? 'Вкл' : 'Выкл'}`);
  }
  if (Boolean(newIsHidden) !== Boolean(targetUser.is_hidden)) {
    changesList.push(`Видимость: ${newIsHidden ? 'Скрыт (только модерация)' : 'Открыт для всех'}`);
  }

  await logAudit(req, {
    action: password ? 'Смена пароля / Редактирование профиля' : 'Редактирование профиля',
    category: 'users',
    target: `${newName} (@${newUsername})`,
    details: changesList.length > 0 ? changesList.join('; ') : `Обновлены данные профиля @${newUsername}`
  });

  const updated = await db.get('SELECT * FROM users WHERE id = ?', [profileId]);
  res.json({ success: true, user: wrapUser(updated), message: `Данные профиля «${newName}» успешно сохранены!` });
});

router.post('/users/:id/avatar', requireAuth, upload.single('avatar_file'), async (req, res) => {
  const profileId = parseInt(req.params.id, 10);
  const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [profileId]);
  const isSelf = (req.user.id === profileId);
  const isAdmin = (req.user.access_level >= 4);
  const isRootGuardian = (req.user.username === db.ROOT_ADMIN_USERNAME);

  if (!isSelf && !isAdmin) {
    return res.status(403).json({ error: 'Недостаточно прав. Менять фото чужого профиля может только Администратор 4-го уровня.' });
  }

  if (targetUser && targetUser.access_level >= 5 && !isSelf && !isRootGuardian) {
    return res.status(403).json({ error: 'Менять аватар другого Хранителя может только Root-Хранитель (admin).' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Файл не выбран.' });
  }

  const avatarUrl = '/uploads/' + req.file.filename;
  await db.run('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, profileId]);
  invalidateUserCache(profileId);

  await logAudit(req, {
    action: 'Смена аватара',
    category: 'users',
    target: targetUser ? `${targetUser.name} (@${targetUser.username})` : `ID ${profileId}`,
    details: `Обновлено фото профиля`
  });

  res.json({ success: true, avatar_url: avatarUrl });
});

router.post('/users/:id/bind-telegram', requireAuth, async (req, res) => {
  const profileId = parseInt(req.params.id, 10);
  const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [profileId]);
  if (!targetUser) {
    return res.status(404).json({ error: 'Пользователь не найден.' });
  }

  if (req.user.id !== profileId && req.user.access_level < 4) {
    return res.status(403).json({ error: 'Недостаточно прав.' });
  }

  // Requirement 3: Telegram only for level 3, 4, 5
  if (targetUser.access_level < 3) {
    return res.status(403).json({
      error: 'Подключение к Telegram доступно только для участников с уровнем доступа 3, 4 и 5 (Руководство, Администраторы, Хранители).'
    });
  }

  const telegramId = (req.body.telegram_id || '').trim();
  if (telegramId) {
    await db.run('UPDATE users SET telegram_id = NULL WHERE telegram_id = ? AND id != ?', [telegramId, profileId]);
  }
  await db.run('UPDATE users SET telegram_id = ? WHERE id = ?', [telegramId || null, profileId]);
  invalidateUserCache(profileId);

  const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', [profileId]);
  if (telegramId && updatedUser) {
    telegramService.persistTelegramBinding(telegramId, updatedUser);
  } else if (!telegramId) {
    telegramService.removeTelegramBinding(profileId);
  }

  await logAudit(req, {
    action: telegramId ? 'Привязка Telegram' : 'Отвязка Telegram',
    category: 'users',
    target: `${targetUser.name} (@${targetUser.username})`,
    details: telegramId ? `Привязан Telegram: ${telegramId}` : 'Telegram отвязан от профиля'
  });

  res.json({ success: true, telegram_id: telegramId });
});

router.post('/users/:id/bind-vk', requireAuth, async (req, res) => {
  const profileId = parseInt(req.params.id, 10);
  if (req.user.id !== profileId && req.user.access_level < 4) {
    return res.status(403).json({ error: 'Недостаточно прав.' });
  }

  let rawVk = (req.body.vk_id || '').trim();
  let vkId = null;

  if (rawVk) {
    const resolved = await vkService.resolveNumericUserId(rawVk);
    if (!resolved) {
      return res.status(400).json({ error: `Не удалось найти страницу ВКонтакте по ссылке или ID «${rawVk}».` });
    }
    vkId = String(resolved);

    await db.run('UPDATE users SET vk_id = NULL WHERE vk_id = ? AND id != ?', [vkId, profileId]);
  }

  await db.run('UPDATE users SET vk_id = ? WHERE id = ?', [vkId, profileId]);
  invalidateUserCache(profileId);

  const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', [profileId]);
  if (vkId && updatedUser && typeof vkService.persistVkBinding === 'function') {
    vkService.persistVkBinding(vkId, updatedUser);
  } else if (!vkId && typeof vkService.removeVkBinding === 'function') {
    vkService.removeVkBinding(profileId);
  }

  await logAudit(req, {
    action: vkId ? 'Привязка ВКонтакте' : 'Отвязка ВКонтакте',
    category: 'users',
    target: updatedUser ? `${updatedUser.name} (@${updatedUser.username})` : `ID ${profileId}`,
    details: vkId ? `Привязан профиль VK: id${vkId}` : 'Профиль VK отвязан'
  });

  res.json({ success: true, vk_id: vkId });
});

// --------------------------------------------------------------------------
// 4. FORCED TASK ASSIGNMENT («⚡ Принудительно выдать задачу»)
// --------------------------------------------------------------------------

router.post('/users/:id/assign-task', requireAuth, async (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [targetUserId]);

  if (!targetUser) {
    return res.status(404).json({ error: 'Пользователь не найден.' });
  }

  if (req.user.access_level < 3 && !req.user.can_create_tasks) {
    return res.status(403).json({ error: 'Недостаточно прав. Принудительно выдавать задачи могут руководители (3–5 ур.) или уполномоченные участники.' });
  }

  if (req.user.access_level < 3 && !hasMatchingDirection(req.user, targetUser)) {
    return res.status(403).json({ error: `Вы можете выдавать задачи только участникам своего направления (${req.user.role}).` });
  }

  const taskId = parseInt(req.body.task_id, 10);
  const comment = (req.body.comment || '').trim();

  const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена.' });
  }

  const oldAssigneeId = task.assigned_to_id;
  await db.run('UPDATE tasks SET assigned_to_id = ?, status = "in_progress" WHERE id = ?', [targetUserId, taskId]);
  task.assigned_to_id = targetUserId;
  task.status = 'in_progress';

  if (oldAssigneeId && oldAssigneeId !== targetUserId) {
    await db.recalculateUserStats(oldAssigneeId);
  }
  await db.recalculateUserStats(targetUserId);

  const nowIso = new Date().toISOString();
  let chatText = `⚡ Руководитель ${req.user.name} (${req.user.role}) принудительно выдал задачу сотруднику ${targetUser.name}.`;
  if (comment) chatText += `\n\n📌 Указание руководителя: ${comment}`;
  await db.run(
    'INSERT INTO task_comments (task_id, user_id, message, created_at) VALUES (?, ?, ?, ?)',
    [taskId, req.user.id, chatText, nowIso]
  );

  try {
    await vkService.notifyTaskForceAssigned(task, targetUser, req.user, comment);
  } catch (e) {}

  try {
    await telegramService.notifyTaskForceAssigned(task, targetUser, req.user, comment);
  } catch (e) {}

  await logAudit(req, {
    action: 'Принудительная выдача задачи',
    category: 'tasks',
    target: `Задача #${task.id} «${task.title}»`,
    details: `Назначена сотруднику ${targetUser.name} (@${targetUser.username})${comment ? `. Указание: ${comment}` : ''}`
  });

  res.json({
    success: true,
    message: `Задача #${task.id} «${task.title}» успешно принудительно выдана сотруднику ${targetUser.name}!`
  });
});

// --------------------------------------------------------------------------
// 5. TASKS LIFECYCLE, CALENDAR & CONTENT PLAN
// --------------------------------------------------------------------------

// Calendar route: returns events with their workshop subtasks
router.get('/tasks/calendar', requireAuth, async (req, res) => {
  const allTasks = await db.all(`
    SELECT t.*,
           u.id AS u_id, u.name AS u_name, u.username AS u_username, u.role AS u_role, u.avatar_url AS u_avatar_url,
           (SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id) AS comment_count
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to_id = u.id
    ORDER BY 
      CASE WHEN t.event_date IS NOT NULL AND TRIM(t.event_date) != '' THEN t.event_date ELSE SUBSTR(t.deadline, 1, 10) END ASC,
      t.id ASC
  `);

  const eventsMap = new Map();
  const dateToEventMap = new Map();
  const subtasks = [];

  for (const t of allTasks) {
    const taskObj = {
      ...t,
      assigned_to: t.assigned_to_id ? {
        id: t.u_id,
        name: t.u_name,
        username: t.u_username,
        role: t.u_role,
        avatar_url: t.u_avatar_url
      } : null,
      comment_count: t.comment_count || 0
    };

    if (t.parent_id) {
      subtasks.push(taskObj);
    } else {
      const rawDate = t.event_date || (t.deadline ? t.deadline.substring(0, 10) : null);
      const dateKey = rawDate ? (rawDate.includes('T') ? rawDate.split('T')[0] : (rawDate.includes(' ') ? rawDate.split(' ')[0] : rawDate)) : new Date().toISOString().substring(0, 10);
      if (!eventsMap.has(t.id)) {
        const ev = {
          id: t.id,
          title: t.title,
          description: t.description,
          event_date: dateKey,
          deadline: t.deadline,
          status: t.status,
          direction: t.direction,
          assigned_to: taskObj.assigned_to,
          comment_count: taskObj.comment_count,
          subtasks: []
        };
        eventsMap.set(t.id, ev);
        if (dateKey !== 'Без даты' && !dateToEventMap.has(dateKey)) {
          dateToEventMap.set(dateKey, ev);
        }
      }
    }
  }

  // Attach subtasks to their parent event or virtual group with O(1) lookup
  for (const st of subtasks) {
    if (eventsMap.has(st.parent_id)) {
      eventsMap.get(st.parent_id).subtasks.push(st);
    } else {
      const rawDate = st.event_date || (st.deadline ? st.deadline.substring(0, 10) : null);
      const dateKey = rawDate ? (rawDate.includes('T') ? rawDate.split('T')[0] : (rawDate.includes(' ') ? rawDate.split(' ')[0] : rawDate)) : new Date().toISOString().substring(0, 10);
      let foundEvent = (dateKey !== 'Без даты') ? dateToEventMap.get(dateKey) : null;
      if (!foundEvent) {
        foundEvent = {
          id: 900000 + st.id,
          title: `Событие дня (${dateKey})`,
          description: '',
          event_date: dateKey,
          deadline: st.deadline,
          status: 'in_progress',
          direction: 'Общее',
          subtasks: []
        };
        eventsMap.set(foundEvent.id, foundEvent);
        if (dateKey !== 'Без даты') {
          dateToEventMap.set(dateKey, foundEvent);
        }
      }
      foundEvent.subtasks.push(st);
    }
  }

  // For standalone single tasks (created with no child subtasks and a specific direction):
  // Expose the task itself as a subtask so it displays with its workshop badge, assignee, status and details
  for (const ev of eventsMap.values()) {
    if (ev.subtasks.length === 0 && ev.direction && ev.direction !== 'Общее') {
      const origTask = allTasks.find(t => t.id === ev.id);
      ev.subtasks.push({
        id: ev.id,
        title: ev.title,
        description: ev.description,
        direction: ev.direction,
        status: ev.status,
        deadline: ev.deadline,
        event_date: ev.event_date,
        parent_id: ev.id,
        assigned_to: ev.assigned_to || (origTask && origTask.assigned_to_id ? {
          id: origTask.u_id,
          name: origTask.u_name,
          username: origTask.u_username,
          role: origTask.u_role,
          avatar_url: origTask.u_avatar_url
        } : null),
        comment_count: origTask ? (origTask.comment_count || 0) : (ev.comment_count || 0)
      });
    }
  }

  const result = Array.from(eventsMap.values());
  result.sort((a, b) => {
    const aDone = (a.status === 'done') ? 1 : 0;
    const bDone = (b.status === 'done') ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;

    const aHasDate = (a.event_date && a.event_date !== 'Без даты') ? 0 : 1;
    const bHasDate = (b.event_date && b.event_date !== 'Без даты') ? 0 : 1;
    if (aHasDate !== bHasDate) return aHasDate - bHasDate;

    if (a.event_date && b.event_date && a.event_date !== 'Без даты' && b.event_date !== 'Без даты') {
      if (a.event_date < b.event_date) return -1;
      if (a.event_date > b.event_date) return 1;
    }
    return b.id - a.id;
  });

  res.json({ events: result });
});

// Multi-Task creation (Levels 3 and 4 only, 1 to 5 selected departments)
router.post('/tasks/multi', requireAuth, requireLevel(3, 'Создавать мульти-задачи могут только руководители (3 и 4 уровень).'), async (req, res) => {
  const title = (req.body.title || '').trim();
  const description = (req.body.description || '').trim();
  const eventDate = (req.body.event_date || '').trim();
  const deadline = (req.body.deadline || `${eventDate} 21:00`).trim();
  const rawDepartments = req.body.departments || [];
  const validWorkshops = ['Фото', 'Дизайн', 'Видео', 'Моушен', 'СММ', 'Звук'];
  const departments = rawDepartments.filter(d => validWorkshops.includes(d));

  if (!title || !eventDate) {
    return res.status(400).json({ error: 'Укажите название мульти-задачи и дату проведения.' });
  }

  if (departments.length === 0) {
    return res.status(400).json({ error: 'Выберите хотя бы одно подразделение (от 1 до 6 цехов).' });
  }

  // 1. Create parent multi-task
  const parentRes = await db.run(
    `INSERT INTO tasks (title, description, direction, event_date, status, deadline)
     VALUES (?, ?, 'Общее', ?, 'in_progress', ?)`,
    [title, description, eventDate, deadline]
  );
  const parentId = parentRes.lastID;

  // 2. Create subtasks for each selected workshop (1 to 5)
  const subtasksDescriptions = req.body.subtasks || {};
  const createdSubtasks = [];

  for (const dir of departments) {
    const subDesc = subtasksDescriptions[dir] || `Задачи отдела ${dir} для события «${title}»`;
    const subTitle = `${dir}: ${title}`;
    const subRes = await db.run(
      `INSERT INTO tasks (title, description, direction, event_date, parent_id, status, deadline)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`,
      [subTitle, subDesc, dir, eventDate, parentId, deadline]
    );
    createdSubtasks.push({
      id: subRes.lastID,
      title: subTitle,
      direction: dir,
      status: 'open',
      parent_id: parentId
    });
  }

  await logAudit(req, {
    action: 'Создание мульти-задачи',
    category: 'tasks',
    target: `Мульти-задача #${parentId} «${title}»`,
    details: `Дата: ${eventDate}. Отделы: ${departments.join(', ')}`
  });

  res.json({
    success: true,
    event_id: parentId,
    title,
    event_date: eventDate,
    departments,
    subtasks: createdSubtasks,
    message: `Мульти-задача «${title}» успешно создана с ${departments.length} подзадачами!`
  });
});

// Edit existing Multi-Task (Levels 3 and 4 only)
router.post('/tasks/multi/:id/update', requireAuth, requireLevel(3, 'Редактировать мульти-задачи могут только руководители (3 и 4 уровень).'), async (req, res) => {
  const multiId = parseInt(req.params.id, 10);
  const parentTask = await db.get('SELECT * FROM tasks WHERE id = ?', [multiId]);

  if (!parentTask) {
    return res.status(404).json({ error: 'Мульти-задача не найдена.' });
  }

  const title = (req.body.title || parentTask.title).trim();
  const description = req.body.description !== undefined ? req.body.description.trim() : parentTask.description;
  const eventDate = (req.body.event_date || parentTask.event_date || '').trim();
  const deadline = (req.body.deadline || parentTask.deadline || `${eventDate} 21:00`).trim();
  const rawDepartments = req.body.departments;
  const validWorkshops = ['Фото', 'Дизайн', 'Видео', 'Моушен', 'СММ', 'Звук'];
  const departments = Array.isArray(rawDepartments) ? rawDepartments.filter(d => validWorkshops.includes(d)) : null;

  // 1. Update parent multi-task
  await db.run(
    'UPDATE tasks SET title = ?, description = ?, event_date = ?, deadline = ? WHERE id = ?',
    [title, description, eventDate, deadline, multiId]
  );

  // 2. Manage subtasks if departments provided
  const subtasksDescriptions = req.body.subtasks || {};
  if (departments && departments.length > 0) {
    const existingSubtasks = await db.all('SELECT * FROM tasks WHERE parent_id = ?', [multiId]);
    const existingDirMap = new Map();
    for (const st of existingSubtasks) {
      existingDirMap.set(st.direction, st);
    }

    for (const dir of departments) {
      const subDesc = subtasksDescriptions[dir] !== undefined ? subtasksDescriptions[dir] : (existingDirMap.get(dir)?.description || `Задачи отдела ${dir}`);
      const subTitle = `${dir}: ${title}`;

      if (existingDirMap.has(dir)) {
        // Update existing subtask
        const existing = existingDirMap.get(dir);
        await db.run(
          'UPDATE tasks SET title = ?, description = ?, event_date = ?, deadline = ? WHERE id = ?',
          [subTitle, subDesc, eventDate, deadline, existing.id]
        );
      } else {
        // Create new subtask for added department
        await db.run(
          `INSERT INTO tasks (title, description, direction, event_date, parent_id, status, deadline)
           VALUES (?, ?, ?, ?, ?, 'open', ?)`,
          [subTitle, subDesc, dir, eventDate, multiId, deadline]
        );
      }
    }

    // Optionally remove unselected subtasks if they are still 'open' (haven't been started)
    for (const st of existingSubtasks) {
      if (!departments.includes(st.direction) && st.status === 'open') {
        await db.run('DELETE FROM tasks WHERE id = ?', [st.id]);
      }
    }
  }

  const updatedSubtasks = await db.all('SELECT * FROM tasks WHERE parent_id = ?', [multiId]);

  await logAudit(req, {
    action: 'Редактирование мульти-задачи',
    category: 'tasks',
    target: `Мульти-задача #${multiId} «${title}»`,
    details: `Дата: ${eventDate}, дедлайн: ${deadline}`
  });

  res.json({
    success: true,
    message: `Мульти-задача «${title}» успешно обновлена!`,
    event: {
      id: multiId,
      title,
      description,
      event_date: eventDate,
      deadline,
      subtasks: updatedSubtasks
    }
  });
});

// DELETE /tasks/multi/:id - Delete a multi-task and all associated subtasks
router.delete('/tasks/multi/:id', requireAuth, requireLevel(3, 'Удалять мульти-задачи могут только руководители (3 и 4 уровень).'), async (req, res) => {
  const multiId = parseInt(req.params.id, 10);
  if (isNaN(multiId)) {
    return res.status(400).json({ error: 'Некорректный ID мульти-задачи.' });
  }

  const parentTask = await db.get('SELECT * FROM tasks WHERE id = ?', [multiId]);
  if (!parentTask) {
    return res.status(404).json({ error: 'Мульти-задача не найдена.' });
  }

  // Find subtasks
  const subtasks = await db.all('SELECT id FROM tasks WHERE parent_id = ?', [multiId]);
  const allIds = [multiId, ...subtasks.map(s => s.id)];

  // Delete all comments
  for (const tid of allIds) {
    await db.run('DELETE FROM task_comments WHERE task_id = ?', [tid]);
  }

  // Delete subtasks
  await db.run('DELETE FROM tasks WHERE parent_id = ?', [multiId]);

  // Delete parent task
  await db.run('DELETE FROM tasks WHERE id = ?', [multiId]);

  await logAudit(req, {
    action: 'Удаление мульти-задачи',
    category: 'tasks',
    target: `Мульти-задача #${multiId} «${parentTask.title}»`,
    details: `Удалена мульти-задача и ${subtasks.length} подзадач`
  });

  res.json({
    success: true,
    message: `Мульти-задача «${parentTask.title}» и связанные с ней цеховые подзадачи (${subtasks.length}) успешно удалены.`
  });
});

// DELETE /tasks/:id - Delete a single task
router.delete('/tasks/:id', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  if (isNaN(taskId)) {
    return res.status(400).json({ error: 'Некорректный ID задачи.' });
  }

  const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена.' });
  }

  // Permission check:
  // Level 3-5: can delete any task
  // Authorized member (can_create_tasks): can delete tasks in their own department
  const isLeaderOrAdmin = req.user.access_level >= 3;
  const isAuthorizedMember = Boolean(req.user.can_create_tasks) && userHasDirection(req.user, task.direction);

  if (!isLeaderOrAdmin && !isAuthorizedMember) {
    return res.status(403).json({
      error: 'Удалять задачи могут только руководители (3–5 ур.) или участники с правом управления задачами в своем цехе.'
    });
  }

  // Delete comments
  await db.run('DELETE FROM task_comments WHERE task_id = ?', [taskId]);

  // If this task has subtasks, clean them up or delete them
  const subtasks = await db.all('SELECT id FROM tasks WHERE parent_id = ?', [taskId]);
  if (subtasks.length > 0) {
    for (const st of subtasks) {
      await db.run('DELETE FROM task_comments WHERE task_id = ?', [st.id]);
    }
    await db.run('DELETE FROM tasks WHERE parent_id = ?', [taskId]);
  }

  // Delete the task itself
  await db.run('DELETE FROM tasks WHERE id = ?', [taskId]);

  // If the task was assigned to someone who completed it, recalculate their stats
  if (task.assigned_to_id && task.status === 'done') {
    await db.run(`
      UPDATE users SET 
        completed_tasks = (SELECT COUNT(*) FROM tasks WHERE assigned_to_id = ? AND status = 'done'),
        average_score = COALESCE((SELECT ROUND(AVG(score), 1) FROM tasks WHERE assigned_to_id = ? AND status = 'done' AND score IS NOT NULL), 0.0)
      WHERE id = ?
    `, [task.assigned_to_id, task.assigned_to_id, task.assigned_to_id]);
    invalidateUserCache(task.assigned_to_id);
  }

  await logAudit(req, {
    action: 'Удаление задачи',
    category: 'tasks',
    target: `Задача #${taskId} «${task.title}»`,
    details: `Цех: ${task.direction}, статус: ${task.status}`
  });

  res.json({
    success: true,
    message: `Задача #${taskId} «${task.title}» успешно удалена.`
  });
});

// POST /tasks/bulk-delete - Delete multiple tasks in one batch operation
router.post('/tasks/bulk-delete', requireAuth, async (req, res) => {
  const rawIds = req.body.task_ids;
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return res.status(400).json({ error: 'Не указан список ID задач для удаления.' });
  }

  const taskIds = rawIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0);
  if (taskIds.length === 0) {
    return res.status(400).json({ error: 'Некорректный список ID задач.' });
  }

  const isLeaderOrAdmin = req.user.access_level >= 3;
  let deletedCount = 0;
  const userStatsToUpdate = new Set();

  for (const tid of taskIds) {
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [tid]);
    if (!task) continue;

    const canDelete = isLeaderOrAdmin || (Boolean(req.user.can_create_tasks) && userHasDirection(req.user, task.direction));
    if (!canDelete) continue;

    // Delete comments
    await db.run('DELETE FROM task_comments WHERE task_id = ?', [tid]);

    // Delete subtasks if any
    const subtasks = await db.all('SELECT id FROM tasks WHERE parent_id = ?', [tid]);
    for (const st of subtasks) {
      await db.run('DELETE FROM task_comments WHERE task_id = ?', [st.id]);
    }
    await db.run('DELETE FROM tasks WHERE parent_id = ?', [tid]);

    // Delete task
    await db.run('DELETE FROM tasks WHERE id = ?', [tid]);
    deletedCount++;

    if (task.assigned_to_id && task.status === 'done') {
      userStatsToUpdate.add(task.assigned_to_id);
    }
  }

  // Recalculate stats for affected users
  for (const uid of userStatsToUpdate) {
    await db.run(`
      UPDATE users SET 
        completed_tasks = (SELECT COUNT(*) FROM tasks WHERE assigned_to_id = ? AND status = 'done'),
        average_score = COALESCE((SELECT ROUND(AVG(score), 1) FROM tasks WHERE assigned_to_id = ? AND status = 'done' AND score IS NOT NULL), 0.0)
      WHERE id = ?
    `, [uid, uid, uid]);
    invalidateUserCache(uid);
  }

  await logAudit(req, {
    action: 'Массовое удаление задач',
    category: 'tasks',
    target: `${deletedCount} задач`,
    details: `Удалены задачи ID: ${taskIds.join(', ')}`
  });

  res.json({
    success: true,
    deleted_count: deletedCount,
    message: `Успешно удалено задач: ${deletedCount}.`
  });
});

router.get('/tasks', requireAuth, async (req, res) => {
  const direction = req.query.direction ? req.query.direction.trim() : null;
  const status = req.query.status ? req.query.status.trim() : null;

  // Single fast query eliminating N+1
  let query = `
    SELECT t.*,
           u.id AS u_id,
           u.name AS u_name,
           u.username AS u_username,
           u.role AS u_role,
           u.avatar_url AS u_avatar_url,
           u.access_level AS u_access_level,
           (SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id) AS comment_count
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to_id = u.id
  `;
  const where = [];
  const params = [];

  if (direction) {
    where.push('t.direction = ?');
    params.push(direction);
  }
  if (status) {
    where.push('t.status = ?');
    params.push(status);
  }

  if (where.length > 0) {
    query += ' WHERE ' + where.join(' AND ');
  }
  query += ` ORDER BY 
    CASE 
      WHEN t.status = 'done' THEN 2
      WHEN t.deadline IS NOT NULL AND TRIM(t.deadline) != '' THEN 0 
      ELSE 1 
    END ASC, 
    CASE WHEN t.status != 'done' THEN t.deadline END ASC, 
    t.id DESC`;

  const tasks = await db.all(query, params);
  const now = new Date();

  const formatted = tasks.map(t => {
    let isExpired = false;
    let isUrgent = false;

    if (t.deadline) {
      const dDate = new Date(t.deadline);
      const diffHours = (dDate - now) / (1000 * 60 * 60);
      isExpired = diffHours < 0;
      isUrgent = diffHours >= 0 && diffHours <= 48;
    }

    return {
      id: t.id,
      title: t.title,
      description: t.description,
      direction: t.direction,
      status: t.status,
      deadline: t.deadline,
      file_link: t.file_link,
      file_name: t.file_name,
      score: t.score,
      rework_notes: t.rework_notes,
      assigned_to: t.assigned_to_id ? {
        id: t.u_id,
        name: t.u_name,
        username: t.u_username,
        role: t.u_role,
        avatar_url: t.u_avatar_url,
        access_level: t.u_access_level
      } : null,
      comment_count: t.comment_count || 0,
      is_expired: isExpired,
      is_urgent: isUrgent
    };
  });

  res.json({ tasks: formatted, total: formatted.length });
});

router.post('/tasks', requireAuth, async (req, res) => {
  const isLeader = (req.user.access_level >= 3);
  const canCreate = Boolean(req.user.can_create_tasks);

  if (!isLeader && !canCreate) {
    return res.status(403).json({ error: 'Недостаточно прав. Создавать задачи могут руководители (ур. 3–5) или участники с правом создания задач.' });
  }

  const title = (req.body.title || '').trim();
  const description = (req.body.description || '').trim();
  let direction = (req.body.direction || '').trim();
  const deadline = (req.body.deadline || '').trim();
  const rawEventDate = (req.body.event_date || '').trim();
  const eventDate = rawEventDate || (deadline ? deadline.substring(0, 10) : new Date().toISOString().substring(0, 10));
  let assignedToId = req.body.assigned_to_id ? parseInt(req.body.assigned_to_id, 10) : null;

  if (!title || !description) {
    return res.status(400).json({ error: 'Заголовок и описание задачи обязательны.' });
  }

  // Level 1 or 2 can only create tasks in their own directions
  if (req.user.access_level <= 2) {
    if (!direction || !userHasDirection(req.user, direction)) {
      direction = getUserDirections(req.user)[0] || 'Фото';
    }
  }

  if (!direction) {
    return res.status(400).json({ error: 'Укажите направление (цех) для задачи.' });
  }

  const status = assignedToId ? 'in_progress' : 'open';

  const result = await db.run(
    `INSERT INTO tasks (title, description, direction, event_date, deadline, assigned_to_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, description, direction, eventDate, deadline || null, assignedToId, status]
  );

  const newTask = await db.get('SELECT * FROM tasks WHERE id = ?', [result.lastID]);

  if (assignedToId) {
    await db.recalculateUserStats(assignedToId);
    const assignedUser = await db.get('SELECT * FROM users WHERE id = ?', [assignedToId]);
    if (assignedUser) {
      try {
        await telegramService.notifyTaskForceAssigned(newTask, assignedUser, req.user);
      } catch (e) {}
      try {
        await vkService.notifyTaskForceAssigned(newTask, assignedUser, req.user);
      } catch (e) {}
    }
  }

  await logAudit(req, {
    action: 'Создание задачи',
    category: 'tasks',
    target: `Задача #${newTask.id} «${title}»`,
    details: `Цех: ${direction}${deadline ? `, дедлайн: ${deadline}` : ''}`
  });

  res.json({ success: true, task: newTask });
});

router.get('/tasks/:id', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const task = await db.get(`
    SELECT t.*,
           u.name AS assignee_name, u.role AS assignee_role, u.avatar_url AS assignee_avatar, u.access_level AS assignee_level,
           g.name AS grader_name, g.role AS grader_role
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to_id = u.id
    LEFT JOIN users g ON t.graded_by_id = g.id
    WHERE t.id = ?
  `, [taskId]);

  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена.' });
  }

  const now = new Date();
  let isExpired = false;
  let isUrgent = false;

  if (task.deadline) {
    const dDate = new Date(task.deadline);
    const diffHours = (dDate - now) / (1000 * 60 * 60);
    isExpired = diffHours < 0;
    isUrgent = diffHours >= 0 && diffHours <= 48;
  }

  const comments = await db.all(`
    SELECT c.id, c.user_id, c.message, c.created_at,
           u.name AS user_name, u.role AS user_role, u.access_level AS user_level, u.avatar_url AS user_avatar
    FROM task_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.task_id = ?
    ORDER BY c.id ASC
  `, [taskId]);

  res.json({
    task: {
      ...task,
      assigned_to: task.assigned_to_id ? {
        id: task.assigned_to_id,
        name: task.assignee_name,
        role: task.assignee_role,
        avatar_url: task.assignee_avatar,
        access_level: task.assignee_level
      } : null,
      graded_by: task.graded_by_id ? {
        id: task.graded_by_id,
        name: task.grader_name,
        role: task.grader_role
      } : null,
      is_expired: isExpired,
      is_urgent: isUrgent
    },
    comments
  });
});

// POST /tasks/:id/update - Update a single task (description/ТЗ, title, deadline)
router.post('/tasks/:id/update', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);

  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена.' });
  }

  const isLeader = (req.user.access_level >= 3);
  const isHeadOfDept = (req.user.access_level === 2 && userHasDirection(req.user, task.direction));
  const canManage = Boolean(req.user.can_create_tasks) && userHasDirection(req.user, task.direction);

  if (!isLeader && !isHeadOfDept && !canManage) {
    return res.status(403).json({ error: 'Недостаточно прав для редактирования ТЗ задачи.' });
  }

  const title = req.body.title !== undefined ? req.body.title.trim() : task.title;
  const description = req.body.description !== undefined ? req.body.description.trim() : task.description;
  const deadline = req.body.deadline !== undefined ? req.body.deadline.trim() : task.deadline;
  const direction = (isLeader && req.body.direction) ? req.body.direction.trim() : task.direction;
  const eventDate = req.body.event_date !== undefined ? req.body.event_date.trim() : (task.event_date || (deadline ? deadline.substring(0, 10) : null));

  if (!title) {
    return res.status(400).json({ error: 'Заголовок задачи не может быть пустым.' });
  }

  await db.run(
    'UPDATE tasks SET title = ?, description = ?, deadline = ?, direction = ?, event_date = ? WHERE id = ?',
    [title, description, deadline || null, direction, eventDate, taskId]
  );

  await logAudit(req, {
    action: 'Редактирование ТЗ задачи',
    category: 'tasks',
    target: `Задача #${taskId} «${title}»`,
    details: `Обновлено ТЗ / параметры задачи`
  });

  const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  res.json({ success: true, task: updatedTask });
});

router.post('/tasks/:id/take', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);

  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена.' });
  }

  if (task.status !== 'open') {
    return res.status(400).json({ error: 'Задача уже находится в работе или завершена.' });
  }

  if (req.user.access_level <= 2 && !userHasDirection(req.user, task.direction)) {
    return res.status(403).json({ error: `Вы можете брать задачи только своего направления (${req.user.role}).` });
  }

  await db.run('UPDATE tasks SET assigned_to_id = ?, status = "in_progress" WHERE id = ?', [req.user.id, taskId]);
  await db.recalculateUserStats(req.user.id);

  const nowIso = new Date().toISOString();
  await db.run(
    'INSERT INTO task_comments (task_id, user_id, message, created_at) VALUES (?, ?, ?, ?)',
    [taskId, req.user.id, `🚀 Участник ${req.user.name} (${req.user.role}) взял задачу в работу.`, nowIso]
  );

  await logAudit(req, {
    action: 'Взятие задачи в работу',
    category: 'tasks',
    target: `Задача #${taskId} «${task.title}»`,
    details: `Участник ${req.user.name} (${req.user.role}) взял задачу`
  });

  res.json({ success: true, message: 'Задача успешно взята в работу!' });
});

router.post('/tasks/:id/submit', requireAuth, upload.single('file_upload'), async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);

  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена.' });
  }

  const isAssignee = (task.assigned_to_id === req.user.id);
  const isLeader = (req.user.access_level >= 3);

  if (!isAssignee && !isLeader) {
    return res.status(403).json({ error: 'Сдать работу может только назначенный исполнитель.' });
  }

  let fileLink = req.body.file_link ? req.body.file_link.trim() : null;
  let fileName = null;

  if (req.file) {
    fileName = req.file.originalname;
    const gdriveRes = await gdriveService.uploadAndCleanupLocal(
      req.file.path,
      req.file.originalname,
      req.file.mimetype
    );
    fileLink = gdriveRes.fileLink;
    fileName = gdriveRes.fileName;
  }

  if (!fileLink && !task.file_link) {
    return res.status(400).json({ error: 'Прикрепите файл результата или укажите внешнюю ссылку.' });
  }

  await db.run(
    `UPDATE tasks SET status = 'review', file_link = COALESCE(?, file_link), file_name = COALESCE(?, file_name) WHERE id = ?`,
    [fileLink, fileName, taskId]
  );

  const nowIso = new Date().toISOString();
  let chatText = `📤 Исполнитель ${req.user.name} сдал работу на проверку.`;
  if (fileLink) {
    chatText += `\n📎 Прикрепленный результат: ${fileLink}`;
  }
  await db.run(
    'INSERT INTO task_comments (task_id, user_id, message, created_at) VALUES (?, ?, ?, ?)',
    [taskId, req.user.id, chatText, nowIso]
  );

  // Notify leadership via bots with inline review buttons
  const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  try {
    await telegramService.notifyTaskSubmitted(updatedTask, req.user);
  } catch (e) {}
  try {
    await vkService.notifyTaskSubmitted(updatedTask, req.user);
  } catch (e) {}

  await logAudit(req, {
    action: 'Сдача задачи на проверку',
    category: 'tasks',
    target: `Задача #${taskId} «${task.title}»`,
    details: fileLink ? `Ссылка: ${fileLink}` : 'Отправлено на проверку'
  });

  res.json({ success: true, message: 'Работа успешно отправлена на проверку руководству!' });
});

router.post('/tasks/:id/rate', requireAuth, requireLevel(3, 'Оценивать и закрывать задачи может только руководство (3-4 уровень).'), async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const score = parseInt(req.body.score, 10);

  if (isNaN(score) || score < 1 || score > 10) {
    return res.status(400).json({ error: 'Оценка должна быть целым числом от 1 до 10.' });
  }

  const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена.' });
  }

  await db.run(
    `UPDATE tasks SET status = 'done', score = ?, graded_by_id = ? WHERE id = ?`,
    [score, req.user.id, taskId]
  );

  if (task.assigned_to_id) {
    await db.recalculateUserStats(task.assigned_to_id);
  }

  const nowIso = new Date().toISOString();
  await db.run(
    'INSERT INTO task_comments (task_id, user_id, message, created_at) VALUES (?, ?, ?, ?)',
    [taskId, req.user.id, `⭐ Руководитель ${req.user.name} принял работу и выставил оценку ${score}/10!`, nowIso]
  );

  // Notify assignee via bots
  const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  const assignee = task.assigned_to_id ? await db.get('SELECT * FROM users WHERE id = ?', [task.assigned_to_id]) : null;
  if (assignee) {
    try {
      await telegramService.notifyTaskGraded(updatedTask, assignee, req.user, score);
    } catch (e) {}
    try {
      await vkService.notifyTaskGraded(updatedTask, assignee, req.user, score);
    } catch (e) {}
  }

  await logAudit(req, {
    action: 'Оценка задачи',
    category: 'tasks',
    target: `Задача #${taskId} «${task.title}»`,
    details: `Оценка: ${score}/10${assignee ? ` для ${assignee.name}` : ''}`
  });

  res.json({ success: true, message: `Задача #${taskId} успешно принята с оценкой ${score}/10!` });
});

router.post('/tasks/:id/rework', requireAuth, requireLevel(3, 'Возвращать задачи на доработку может только руководство (3–5 уровень).'), async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const reworkNotes = (req.body.rework_notes || '').trim();

  if (!reworkNotes) {
    return res.status(400).json({ error: 'Пожалуйста, укажите обязательные замечания для доработки.' });
  }

  const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена.' });
  }

  await db.run(
    `UPDATE tasks SET status = 'rework', rework_notes = ? WHERE id = ?`,
    [reworkNotes, taskId]
  );

  const nowIso = new Date().toISOString();
  const chatText = `🔄 Руководитель ${req.user.name} вернул задачу на доработку.\n\n⚠️ Замечания и правки: ${reworkNotes}`;
  await db.run(
    'INSERT INTO task_comments (task_id, user_id, message, created_at) VALUES (?, ?, ?, ?)',
    [taskId, req.user.id, chatText, nowIso]
  );

  // Notify assignee via bots
  const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  const assignee = task.assigned_to_id ? await db.get('SELECT * FROM users WHERE id = ?', [task.assigned_to_id]) : null;
  if (assignee) {
    try {
      await telegramService.notifyTaskRework(updatedTask, assignee, req.user, reworkNotes);
    } catch (e) {}
    try {
      await vkService.notifyTaskRework(updatedTask, assignee, req.user, reworkNotes);
    } catch (e) {}
  }

  await logAudit(req, {
    action: 'Возврат задачи на доработку',
    category: 'tasks',
    target: `Задача #${taskId} «${task.title}»`,
    details: `Замечания: ${reworkNotes}`
  });

  res.json({ success: true, message: 'Задача возвращена на доработку исполнителю.' });
});

// --------------------------------------------------------------------------
// 6. TASK DISCUSSION CHAT (/api/tasks/:id/comments)
// --------------------------------------------------------------------------

router.get('/tasks/:id/comments', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const task = await db.get('SELECT id, assigned_to_id FROM tasks WHERE id = ?', [taskId]);
  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена.' });
  }

  // Fast sub-millisecond query using idx_task_comments_task_id
  const comments = await db.all(`
    SELECT c.id, c.user_id, c.message, c.created_at,
           u.name AS user_name, u.role AS user_role, u.access_level AS user_level, u.avatar_url AS user_avatar
    FROM task_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.task_id = ?
    ORDER BY c.id ASC
  `, [taskId]);

  const mapped = comments.map(c => ({
    id: c.id,
    user_id: c.user_id,
    user_name: c.user_name || 'Пользователь',
    user_role: c.user_role || '',
    user_level: c.user_level || 1,
    user_avatar: c.user_avatar || null,
    message: c.message,
    created_at: c.created_at,
    is_me: c.user_id === req.user.id,
    is_author_assignee: Boolean(task.assigned_to_id && task.assigned_to_id === c.user_id)
  }));

  res.json({ success: true, comments: mapped });
});

router.post('/tasks/:id/comments', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const message = (req.body.message || '').trim();

  if (!message) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым.' });
  }

  const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена.' });
  }

  const nowIso = new Date().toISOString();
  const resInsert = await db.run(
    'INSERT INTO task_comments (task_id, user_id, message, created_at) VALUES (?, ?, ?, ?)',
    [taskId, req.user.id, message, nowIso]
  );

  const newComment = {
    id: resInsert.lastID,
    user_id: req.user.id,
    user_name: req.user.name,
    user_role: req.user.role,
    user_level: req.user.access_level,
    user_avatar: req.user.avatar_url,
    message,
    created_at: nowIso,
    is_me: true,
    is_author_assignee: Boolean(task.assigned_to_id && task.assigned_to_id === req.user.id)
  };

  // Bot notifications for chat messages
  try {
    if (typeof telegramService.notifyTaskNewComment === 'function') {
      await telegramService.notifyTaskNewComment(task, req.user, message);
    }
  } catch (e) {}
  try {
    if (typeof vkService.notifyTaskNewComment === 'function') {
      await vkService.notifyTaskNewComment(task, req.user, message);
    }
  } catch (e) {}

  res.json({ success: true, comment: newComment });
});

// --------------------------------------------------------------------------
// 7. MATERIALS CATALOG (/api/materials)
// --------------------------------------------------------------------------

router.get('/materials', requireAuth, async (req, res) => {
  const direction = req.query.direction ? req.query.direction.trim() : null;
  const category = req.query.category ? req.query.category.trim() : null;

  let query = `
    SELECT m.*, u.id AS u_id, u.name AS u_name, u.role AS u_role, u.avatar_url AS u_avatar_url
    FROM work_materials m
    LEFT JOIN users u ON m.uploaded_by_id = u.id
  `;
  const where = [];
  const params = [];

  if (direction) {
    where.push('m.direction = ?');
    params.push(direction);
  }
  if (category) {
    where.push('m.category = ?');
    params.push(category);
  }

  if (where.length > 0) {
    query += ' WHERE ' + where.join(' AND ');
  }
  query += ' ORDER BY m.id DESC';

  const materials = await db.all(query, params);

  // Direction counts computed directly inside SQLite
  const directionCounts = await db.all('SELECT direction, COUNT(*) as c FROM work_materials GROUP BY direction');
  const countsObj = {
    'Фото': 0,
    'Дизайн': 0,
    'Видео': 0,
    'Моушен': 0,
    'СММ': 0,
    'Звук': 0
  };
  let totalCount = 0;
  for (const row of directionCounts) {
    countsObj[row.direction] = row.c;
    totalCount += row.c;
  }

  res.json({
    materials: materials.map(m => ({
      ...m,
      uploaded_by: m.uploaded_by_id ? {
        id: m.u_id,
        name: m.u_name,
        role: m.u_role,
        avatar_url: m.u_avatar_url
      } : null
    })),
    counts: countsObj,
    total_count: totalCount
  });
});

router.post('/materials', requireAuth, requireLevel(3, 'Загружать материалы могут только руководители (3 и 4 уровень).'), upload.single('file_upload'), async (req, res) => {
  const title = (req.body.title || '').trim();
  const direction = (req.body.direction || '').trim();
  const category = (req.body.category || 'Материалы').trim();
  const description = (req.body.description || '').trim() || null;
  let fileLink = (req.body.file_link || '').trim();
  let fileName = null;

  if (!title || !direction) {
    return res.status(400).json({ error: 'Название и направление материала обязательны.' });
  }

  if (req.file) {
    fileName = req.file.originalname;
    const gdriveRes = await gdriveService.uploadAndCleanupLocal(
      req.file.path,
      req.file.originalname,
      req.file.mimetype
    );
    fileLink = gdriveRes.fileLink;
    fileName = gdriveRes.fileName;
  }

  if (!fileLink) {
    return res.status(400).json({ error: 'Прикрепите файл или внешнюю ссылку.' });
  }

  const nowIso = new Date().toISOString();
  const result = await db.run(
    `INSERT INTO work_materials (title, description, direction, category, file_link, file_name, uploaded_by_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, direction, category, fileLink, fileName, req.user.id, nowIso]
  );

  const created = await db.get('SELECT * FROM work_materials WHERE id = ?', [result.lastID]);

  await logAudit(req, {
    action: 'Добавление материала',
    category: 'materials',
    target: `Материал #${result.lastID} «${title}»`,
    details: `Цех: ${direction}, категория: ${category}`
  });

  res.json({ success: true, material: created });
});

router.delete('/materials/:id', requireAuth, requireLevel(3, 'Удалять материалы могут только руководители (3 и 4 уровень).'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = await db.get('SELECT * FROM work_materials WHERE id = ?', [id]);
  await db.run('DELETE FROM work_materials WHERE id = ?', [id]);

  await logAudit(req, {
    action: 'Удаление материала',
    category: 'materials',
    target: existing ? `Материал #${id} «${existing.title}»` : `Материал #${id}`,
    details: existing ? `Цех: ${existing.direction}` : 'Материал удален'
  });

  res.json({ success: true });
});

// --------------------------------------------------------------------------
// 8. SUPERADMIN USER MANAGEMENT (/api/admin/users)
// --------------------------------------------------------------------------

router.get('/admin/users', requireAuth, requireLevel(4, 'Доступ запрещен. Панель доступна только Главному администратору (4 уровень).'), async (req, res) => {
  const pendingUsers = await db.all('SELECT * FROM users WHERE is_approved = 0 ORDER BY id DESC');
  const approvedUsers = await db.all('SELECT * FROM users WHERE is_approved = 1 ORDER BY access_level DESC, role ASC, name ASC');

  res.json({
    pending_users: pendingUsers.map(wrapUser),
    approved_users: approvedUsers.map(wrapUser)
  });
});

router.post('/admin/users/:id/approve', requireAuth, requireLevel(4), async (req, res) => {
  const profileId = parseInt(req.params.id, 10);
  const accessLevel = parseInt(req.body.access_level, 10) || 1;
  const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [profileId]);

  if (!targetUser) {
    return res.status(404).json({ error: 'Пользователь не найден.' });
  }

  const maxLevel = req.user.access_level >= 5 ? 5 : 4;
  const finalLevel = Math.max(1, Math.min(maxLevel, accessLevel));

  let finalRole = targetUser.role;
  if (Array.isArray(req.body.roles) && req.body.roles.length > 0) {
    finalRole = req.body.roles.map(r => String(r).trim()).filter(Boolean).join(', ');
  } else if (typeof req.body.role === 'string' && req.body.role.trim()) {
    finalRole = req.body.role.trim();
  }

  await db.run(
    'UPDATE users SET is_approved = 1, access_level = ?, role = ? WHERE id = ?',
    [finalLevel, finalRole, profileId]
  );
  invalidateUserCache(profileId);

  try {
    await telegramService.notifyUserApproved({ ...targetUser, role: finalRole }, finalLevel);
  } catch (e) {}

  await logAudit(req, {
    action: 'Одобрение заявки',
    category: 'users',
    target: `${targetUser.name} (@${targetUser.username})`,
    details: `Профиль одобрен с уровнем доступа ${finalLevel} (Цехи: ${finalRole})`
  });

  res.json({ success: true, message: `Заявка пользователя «${targetUser.name}» успешно одобрена!` });
});

router.post('/admin/users/:id/reject', requireAuth, requireLevel(4), async (req, res) => {
  const profileId = parseInt(req.params.id, 10);
  const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [profileId]);

  if (!targetUser) {
    return res.status(404).json({ error: 'Пользователь не найден.' });
  }

  if (targetUser.username === db.ROOT_ADMIN_USERNAME) {
    return res.status(403).json({ error: `Системный root-профиль '${db.ROOT_ADMIN_USERNAME}' защищен от удаления.` });
  }

  await db.run('DELETE FROM users WHERE id = ?', [profileId]);
  invalidateUserCache(profileId);

  await logAudit(req, {
    action: 'Отклонение заявки',
    category: 'users',
    target: `${targetUser.name} (@${targetUser.username})`,
    details: `Заявка на регистрацию отклонена, профиль удален`
  });

  res.json({ success: true, message: 'Заявка на регистрацию отклонена, профиль удален.' });
});

router.post('/admin/users/:id/toggle-create-tasks', requireAuth, requireLevel(4), async (req, res) => {
  const profileId = parseInt(req.params.id, 10);
  const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [profileId]);

  if (!targetUser) {
    return res.status(404).json({ error: 'Пользователь не найден.' });
  }

  const newStatus = targetUser.can_create_tasks ? 0 : 1;
  await db.run('UPDATE users SET can_create_tasks = ? WHERE id = ?', [newStatus, profileId]);
  invalidateUserCache(profileId);

  await logAudit(req, {
    action: newStatus ? 'Выдача права создания задач' : 'Отзыв права создания задач',
    category: 'users',
    target: `${targetUser.name} (@${targetUser.username})`,
    details: `Право создания задач: ${newStatus ? 'включено' : 'отключено'}`
  });

  res.json({
    success: true,
    can_create_tasks: Boolean(newStatus),
    message: newStatus ? `Право создания задач включено для ${targetUser.name}.` : `Право создания задач отключено для ${targetUser.name}.`
  });
});

router.post('/admin/users/:id/toggle-hidden', requireAuth, requireLevel(4), async (req, res) => {
  const profileId = parseInt(req.params.id, 10);
  const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [profileId]);

  if (!targetUser) {
    return res.status(404).json({ error: 'Пользователь не найден.' });
  }

  const newStatus = targetUser.is_hidden ? 0 : 1;
  await db.run('UPDATE users SET is_hidden = ? WHERE id = ?', [newStatus, profileId]);
  invalidateUserCache(profileId);

  await logAudit(req, {
    action: newStatus ? 'Скрытие профиля' : 'Отображение профиля',
    category: 'users',
    target: `${targetUser.name} (@${targetUser.username})`,
    details: newStatus
      ? 'Профиль скрыт из общих списков (виден только в панели модерации)'
      : 'Профиль снова виден в общих списках'
  });

  res.json({
    success: true,
    is_hidden: Boolean(newStatus),
    message: newStatus
      ? `Профиль «${targetUser.name}» скрыт из всех общих списков (виден только в панели модерации).`
      : `Профиль «${targetUser.name}» снова виден всем пользователям.`
  });
});

router.post('/admin/users/:id/delete', requireAuth, requireLevel(4), async (req, res) => {
  const profileId = parseInt(req.params.id, 10);
  const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [profileId]);

  if (!targetUser) {
    return res.status(404).json({ error: 'Пользователь не найден.' });
  }

  const isCallerRoot = req.user.username === db.ROOT_ADMIN_USERNAME;
  if (targetUser.username === db.ROOT_ADMIN_USERNAME) {
    return res.status(403).json({ error: 'Системный Root-Хранитель защищен от удаления!' });
  }

  if (targetUser.access_level >= 5 && !isCallerRoot) {
    return res.status(403).json({ error: 'Пользователь 5 уровня (Хранитель) защищен от удаления! Управлять другими Хранителями может только Root-Хранитель.' });
  }

  if (targetUser.id === req.user.id) {
    return res.status(400).json({ error: 'Вы не можете удалить свой собственный профиль во время активной сессии.' });
  }

  // Safe detachment of tasks back to 'open'
  await db.run('UPDATE tasks SET assigned_to_id = NULL, status = "open" WHERE assigned_to_id = ? AND status = "in_progress"', [profileId]);
  await db.run('UPDATE tasks SET assigned_to_id = NULL WHERE assigned_to_id = ?', [profileId]);
  await db.run('DELETE FROM users WHERE id = ?', [profileId]);
  invalidateUserCache(profileId);

  await logAudit(req, {
    action: 'Удаление профиля',
    category: 'users',
    target: `${targetUser.name} (@${targetUser.username})`,
    details: `Удален профиль (цех: ${targetUser.role}, уровень: ${targetUser.access_level})`
  });

  res.json({ success: true, message: `Профиль «${targetUser.name}» удален. Активные задачи возвращены в статус «open».` });
});

// --------------------------------------------------------------------------
// 9. TELEGRAM BOT SETTINGS FOR ADMINS
// --------------------------------------------------------------------------

router.get('/admin/telegram-config', requireAuth, requireLevel(4), async (req, res) => {
  const cfg = telegramService.getConfig ? telegramService.getConfig() : {};
  const rawToken = telegramService.getBotToken ? telegramService.getBotToken() : (cfg.bot_token || '');
  res.json({
    token: rawToken ? secretVault.maskSecret(rawToken) : '',
    group_chat_id: cfg.leadership_group_chat_id || '',
    bot_username: cfg.bot_username || 'ping_sstu_bot',
    is_active: Boolean(rawToken)
  });
});

router.post('/admin/telegram-config', requireAuth, requireLevel(4), async (req, res) => {
  const token = (req.body.token || '').trim();
  const groupChatId = (req.body.group_chat_id || '').trim();
  const botUsername = (req.body.bot_username || '').trim();

  const updates = {};
  if (token && !secretVault.isMasked(token)) {
    updates.bot_token = token;
  }
  if (groupChatId) updates.leadership_group_chat_id = groupChatId;
  if (botUsername) updates.bot_username = botUsername;

  try {
    if (telegramService.saveConfig) {
      telegramService.saveConfig(updates);
    }
  } catch (e) {
    return res.status(500).json({ error: 'Ошибка сохранения настроек: ' + e.message });
  }

  res.json({ success: true, message: 'Настройки Telegram бота успешно сохранены!' });
});

router.get('/admin/vk-config', requireAuth, requireLevel(4), async (req, res) => {
  const cfg = vkService.getConfig ? vkService.getConfig() : {};
  const rawToken = vkService.getGroupToken ? vkService.getGroupToken() : (cfg.vk_group_token || '');
  const rawGroupId = vkService.getGroupId ? vkService.getGroupId() : (cfg.vk_group_id || '');
  res.json({
    token: rawToken ? secretVault.maskSecret(rawToken) : '',
    group_id: rawGroupId,
    is_enabled: cfg.is_enabled !== false,
    is_active: Boolean(rawToken)
  });
});

router.post('/admin/vk-config', requireAuth, requireLevel(4), async (req, res) => {
  const token = (req.body.token || '').trim();
  const groupId = (req.body.group_id || '').trim();
  const isEnabled = req.body.is_enabled !== false;

  const updates = { is_enabled: isEnabled };
  if (token && !secretVault.isMasked(token)) {
    updates.vk_group_token = token;
  }
  if (groupId) {
    updates.vk_group_id = groupId;
  }

  try {
    if (vkService.saveConfig) {
      vkService.saveConfig(updates);
    }
  } catch (e) {
    return res.status(500).json({ error: 'Ошибка сохранения настроек VK: ' + e.message });
  }

  res.json({ success: true, message: 'Настройки VK бота успешно сохранены!' });
});

router.post('/admin/telegram-test', requireAuth, requireLevel(4), async (req, res) => {
  const cfg = telegramService.getConfig ? telegramService.getConfig() : {};
  const chatId = req.body.chat_id || cfg.leadership_group_chat_id;

  if (!chatId) {
    return res.status(400).json({ error: 'Укажите ID чата или настройте ID группы руководства.' });
  }

  try {
    const testMsg = (
      '🌲 <b>ТЕСТОВОЕ УВЕДОМЛЕНИЕ МЕДИАЦЕНТРА «СМС СГТУ»</b>\n\n' +
      '✅ Бот успешно подключен к платформе!\n' +
      '🔔 Сюда будут приходить новые заявки на модерацию и сдачи работ.\n\n' +
      `Отправитель: ${req.user.name} (${req.user.role})`
    );
    const sent = await telegramService.sendTelegramMessage(chatId, testMsg);
    if (sent) {
      res.json({ success: true, message: `Тестовое сообщение успешно отправлено в чат ${chatId}!` });
    } else {
      res.status(500).json({ error: 'Не удалось отправить сообщение. Проверьте правильность токена и Chat ID.' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Ошибка отправки: ' + e.message });
  }
});

// --------------------------------------------------------------------------
// 9. IDEAS & SUGGESTIONS MINI-CHATS («💡 Предложить идею»)
// --------------------------------------------------------------------------

// GET /api/ideas - List ideas (author sees own ideas, 3-5 lvl sees all or filtered)
router.get('/ideas', requireAuth, async (req, res) => {
  const isManagement = req.user.access_level >= 3;
  const targetUserId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;

  let sql = `
    SELECT i.*,
           u.name AS author_name, u.role AS author_role, u.avatar_url AS author_avatar, u.access_level AS author_level,
           (SELECT COUNT(*) FROM idea_comments ic WHERE ic.idea_id = i.id) AS comments_count
    FROM ideas i
    JOIN users u ON i.user_id = u.id
  `;
  const params = [];

  if (targetUserId) {
    // If requesting specific user's ideas
    if (!isManagement && targetUserId !== req.user.id) {
      return res.status(403).json({ error: 'У вас нет прав для просмотра идей других участников.' });
    }
    sql += ' WHERE i.user_id = ?';
    params.push(targetUserId);
  } else if (!isManagement) {
    // Regular users (lvl 1-2) can only see their own ideas
    sql += ' WHERE i.user_id = ?';
    params.push(req.user.id);
  }

  sql += ' ORDER BY i.id DESC';

  const rows = await db.all(sql, params);
  res.json({ success: true, ideas: rows });
});

// POST /api/ideas - Propose a new idea
router.post('/ideas', requireAuth, async (req, res) => {
  const title = (req.body.title || '').trim();
  const description = (req.body.description || '').trim();

  if (!title || !description) {
    return res.status(400).json({ error: 'Укажите название и подробное описание вашей идеи.' });
  }

  const now = new Date().toISOString();
  const result = await db.run(
    'INSERT INTO ideas (user_id, title, description, status, created_at) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, title, description, 'new', now]
  );
  const ideaId = result.lastID;

  // Insert initial description into idea_comments as the first message
  await db.run(
    'INSERT INTO idea_comments (idea_id, user_id, message, created_at) VALUES (?, ?, ?, ?)',
    [ideaId, req.user.id, description, now]
  );

  // Notify leadership group via Telegram if configured
  try {
    const cfg = telegramService.getConfig ? telegramService.getConfig() : {};
    if (cfg.leadership_group_chat_id) {
      const msg = [
        '💡 <b>НОВАЯ ИДЕЯ ОТ УЧАСТНИКА КОМАНДЫ</b>',
        '━━━━━━━━━━━━━━━━━━',
        `📌 <b>${title}</b>`,
        `👤 Автор: ${req.user.name} (${req.user.role}, ${req.user.access_level} ур.)`,
        `📝 Описание:\n${description}`,
        '━━━━━━━━━━━━━━━━━━',
        'Ответить автору можно на платформе СМС СГТУ в разделе «Руководство».'
      ].join('\n');
      await telegramService.sendTelegramMessage(cfg.leadership_group_chat_id, msg);
    }
  } catch (e) {}

  const createdIdea = await db.get(
    `SELECT i.*, u.name AS author_name, u.role AS author_role, u.avatar_url AS author_avatar, u.access_level AS author_level, 1 AS comments_count
     FROM ideas i
     JOIN users u ON i.user_id = u.id
     WHERE i.id = ?`,
    [ideaId]
  );

  res.json({ success: true, idea: createdIdea, message: 'Идея успешно предложена и передана руководству!' });
});

// GET /api/ideas/:id - Get idea details & discussion comments
router.get('/ideas/:id', requireAuth, async (req, res) => {
  const ideaId = parseInt(req.params.id, 10);
  const idea = await db.get(
    `SELECT i.*, u.name AS author_name, u.role AS author_role, u.avatar_url AS author_avatar, u.access_level AS author_level
     FROM ideas i
     JOIN users u ON i.user_id = u.id
     WHERE i.id = ?`,
    [ideaId]
  );

  if (!idea) {
    return res.status(404).json({ error: 'Идея не найдена.' });
  }

  // Access check: only author or leadership (level >= 3)
  if (idea.user_id !== req.user.id && req.user.access_level < 3) {
    return res.status(403).json({ error: 'Чат этой идеи доступен только ее автору и руководству (3–5 уровень).' });
  }

  const comments = await db.all(
    `SELECT ic.*, u.name AS user_name, u.role AS user_role, u.avatar_url AS user_avatar, u.access_level AS user_level
     FROM idea_comments ic
     JOIN users u ON ic.user_id = u.id
     WHERE ic.idea_id = ?
     ORDER BY ic.id ASC`,
    [ideaId]
  );

  const mappedComments = comments.map(c => ({
    ...c,
    is_me: c.user_id === req.user.id,
    is_author: c.user_id === idea.user_id
  }));

  res.json({ success: true, idea, comments: mappedComments });
});

// POST /api/ideas/:id/comments - Send message into idea mini-chat
router.post('/ideas/:id/comments', requireAuth, async (req, res) => {
  const ideaId = parseInt(req.params.id, 10);
  const message = (req.body.message || '').trim();

  if (!message) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым.' });
  }

  const idea = await db.get('SELECT * FROM ideas WHERE id = ?', [ideaId]);
  if (!idea) {
    return res.status(404).json({ error: 'Идея не найдена.' });
  }

  // Permission check: only author or leadership (3-5 lvl)
  if (idea.user_id !== req.user.id && req.user.access_level < 3) {
    return res.status(403).json({ error: 'Вы не можете отправлять сообщения в чат этой идеи.' });
  }

  const now = new Date().toISOString();
  const result = await db.run(
    'INSERT INTO idea_comments (idea_id, user_id, message, created_at) VALUES (?, ?, ?, ?)',
    [ideaId, req.user.id, message, now]
  );

  const newComment = {
    id: result.lastID,
    idea_id: ideaId,
    user_id: req.user.id,
    user_name: req.user.name,
    user_role: req.user.role,
    user_avatar: req.user.avatar_url,
    user_level: req.user.access_level,
    message,
    created_at: now,
    is_me: true,
    is_author: req.user.id === idea.user_id
  };

  // If leadership answered, notify author in VK
  if (req.user.access_level >= 3 && req.user.id !== idea.user_id) {
    try {
      const author = await db.get('SELECT * FROM users WHERE id = ?', [idea.user_id]);
      if (author && author.vk_id && typeof vkService.sendVkMessage === 'function') {
        const text = [
          '💬 ОТВЕТ РУКОВОДСТВА НА ВАШУ ИДЕЮ',
          '━━━━━━━━━━━━━━━━━━',
          `📌 Идея: «${idea.title}»`,
          `👤 От: ${req.user.name} (${req.user.role})`,
          `💬 Сообщение:`,
          `«${message}»`,
          '━━━━━━━━━━━━━━━━━━',
          'Откройте свой профиль на платформе СМС СГТУ, чтобы продолжить диалог.'
        ].join('\n');
        await vkService.sendVkMessage(author.vk_id, text);
      }
    } catch (e) {}
  }

  res.json({ success: true, comment: newComment });
});

// POST /api/ideas/:id/status - Update idea status (3-5 lvl only)
router.post('/ideas/:id/status', requireAuth, requireLevel(3), async (req, res) => {
  const ideaId = parseInt(req.params.id, 10);
  const status = (req.body.status || '').trim();
  const validStatuses = ['new', 'in_review', 'approved', 'rejected', 'implemented'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус идеи.' });
  }

  const idea = await db.get('SELECT * FROM ideas WHERE id = ?', [ideaId]);
  if (!idea) {
    return res.status(404).json({ error: 'Идея не найдена.' });
  }

  await db.run('UPDATE ideas SET status = ? WHERE id = ?', [status, ideaId]);

  // Status label translation for notifications
  const statusLabels = {
    new: 'Новая',
    in_review: 'На рассмотрении',
    approved: 'Одобрено к реализации',
    rejected: 'Отклонено',
    implemented: 'Реализовано'
  };

  // Notify author in VK about status change
  try {
    const author = await db.get('SELECT * FROM users WHERE id = ?', [idea.user_id]);
    if (author && author.vk_id && typeof vkService.sendVkMessage === 'function') {
      const text = [
        '🔔 ИЗМЕНЕН СТАТУС ВАШЕЙ ИДЕИ',
        '━━━━━━━━━━━━━━━━━━',
        `📌 Идея: «${idea.title}»`,
        `📊 Новый статус: ${statusLabels[status] || status}`,
        `👤 Изменил: ${req.user.name} (${req.user.role})`,
        '━━━━━━━━━━━━━━━━━━',
        'Подробности и обсуждение доступны в вашем профиле на платформе СМС СГТУ.'
      ].join('\n');
      await vkService.sendVkMessage(author.vk_id, text);
    }
  } catch (e) {}

  res.json({ success: true, status, message: `Статус идеи обновлен на «${statusLabels[status]}»` });
});

// DELETE /api/ideas/:id - Delete idea & discussion (Level 4-5 only)
router.delete('/ideas/:id', requireAuth, requireLevel(4), async (req, res) => {
  const ideaId = parseInt(req.params.id, 10);
  const idea = await db.get('SELECT * FROM ideas WHERE id = ?', [ideaId]);
  if (!idea) {
    return res.status(404).json({ error: 'Предложение не найдено.' });
  }

  await db.run('DELETE FROM idea_comments WHERE idea_id = ?', [ideaId]);
  await db.run('DELETE FROM ideas WHERE id = ?', [ideaId]);

  res.json({ success: true, message: 'Предложение успешно удалено.' });
});

// --------------------------------------------------------------------------
// GUARDIAN SECRET NOTES ("Гос-Долг USA" - Level 5 only)
// --------------------------------------------------------------------------

// GET /api/guardian-notes - Get all secret notes
router.get('/guardian-notes', requireAuth, requireLevel(5), async (req, res) => {
  const notes = await db.all(`
    SELECT n.*, u.name AS author_name, u.role AS author_role, u.avatar_url AS author_avatar
    FROM guardian_notes n
    JOIN users u ON n.user_id = u.id
    ORDER BY n.is_pinned DESC, n.id DESC
  `);
  res.json({ success: true, notes });
});

// POST /api/guardian-notes - Create a new secret note
router.post('/guardian-notes', requireAuth, requireLevel(5), async (req, res) => {
  const title = (req.body.title || '').trim();
  const content = (req.body.content || '').trim();
  const isPinned = req.body.is_pinned ? 1 : 0;

  if (!content) {
    return res.status(400).json({ error: 'Содержание заметки не может быть пустым.' });
  }

  const now = new Date().toISOString();
  const result = await db.run(
    'INSERT INTO guardian_notes (user_id, title, content, is_pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.id, title || 'Без названия', content, isPinned, now, now]
  );

  const note = await db.get(`
    SELECT n.*, u.name AS author_name, u.role AS author_role, u.avatar_url AS author_avatar
    FROM guardian_notes n
    JOIN users u ON n.user_id = u.id
    WHERE n.id = ?
  `, [result.lastID]);

  res.json({ success: true, note, message: 'Заметка сохранена в секретном архиве Хранителей.' });
});

// PUT /api/guardian-notes/:id - Update secret note
router.put('/guardian-notes/:id', requireAuth, requireLevel(5), async (req, res) => {
  const noteId = parseInt(req.params.id, 10);
  const note = await db.get('SELECT * FROM guardian_notes WHERE id = ?', [noteId]);
  if (!note) {
    return res.status(404).json({ error: 'Заметка не найдена.' });
  }

  const title = req.body.title !== undefined ? req.body.title.trim() : note.title;
  const content = req.body.content !== undefined ? req.body.content.trim() : note.content;
  const isPinned = req.body.is_pinned !== undefined ? (req.body.is_pinned ? 1 : 0) : note.is_pinned;

  if (!content) {
    return res.status(400).json({ error: 'Содержание заметки не может быть пустым.' });
  }

  const now = new Date().toISOString();
  await db.run(
    'UPDATE guardian_notes SET title = ?, content = ?, is_pinned = ?, updated_at = ? WHERE id = ?',
    [title || 'Без названия', content, isPinned, now, noteId]
  );

  const updated = await db.get(`
    SELECT n.*, u.name AS author_name, u.role AS author_role, u.avatar_url AS author_avatar
    FROM guardian_notes n
    JOIN users u ON n.user_id = u.id
    WHERE n.id = ?
  `, [noteId]);

  res.json({ success: true, note: updated, message: 'Заметка обновлена.' });
});

// DELETE /api/guardian-notes/:id - Delete secret note
router.delete('/guardian-notes/:id', requireAuth, requireLevel(5), async (req, res) => {
  const noteId = parseInt(req.params.id, 10);
  const note = await db.get('SELECT * FROM guardian_notes WHERE id = ?', [noteId]);
  if (!note) {
    return res.status(404).json({ error: 'Заметка не найдена.' });
  }

  await db.run('DELETE FROM guardian_notes WHERE id = ?', [noteId]);
  res.json({ success: true, message: 'Заметка удалена из архива.' });
});

// --------------------------------------------------------------------------
// 12. GOOGLE DRIVE INTEGRATION STATUS & CONFIG
// --------------------------------------------------------------------------

router.get('/gdrive/config', requireAuth, requireLevel(3), (req, res) => {
  const config = gdriveService.getGdriveConfig();
  const saInfo = gdriveService.getServiceAccountInfo();
  res.json({
    config,
    service_account: saInfo
  });
});

router.post('/gdrive/config', requireAuth, requireLevel(4), (req, res) => {
  const { folder_id, folder_url, webhook_url } = req.body;
  const updates = {};
  if (folder_id !== undefined) updates.folder_id = folder_id.trim();
  if (folder_url !== undefined) updates.folder_url = folder_url.trim();
  if (webhook_url !== undefined) updates.webhook_url = webhook_url.trim();

  gdriveService.saveGdriveConfig(updates);
  res.json({
    success: true,
    config: gdriveService.getGdriveConfig(),
    service_account: gdriveService.getServiceAccountInfo(),
    message: 'Настройки Google Диска успешно сохранены.'
  });
});

router.get('/gdrive/script-template', requireAuth, requireLevel(3), (req, res) => {
  res.json({
    template: gdriveService.getAppsScriptTemplate()
  });
});

// --------------------------------------------------------------------------
// 13. TEAM GENERAL CHAT (/api/team-chat — Levels 2, 3, 4, 5)
// --------------------------------------------------------------------------

router.get('/team-chat', requireAuth, requireLevel(2, 'Общий чат команды доступен участникам со 2 уровня доступа.'), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 250, 500);
  const afterId = parseInt(req.query.after_id, 10) || 0;

  let rows;
  if (afterId > 0) {
    rows = await db.all(`
      SELECT m.*,
             u.name AS user_name, u.username AS user_username, u.role AS user_role,
             u.access_level AS user_level, u.avatar_url AS user_avatar,
             r.message AS reply_message, r.photo_url AS reply_photo_url,
             ru.name AS reply_user_name
      FROM team_chat_messages m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN team_chat_messages r ON m.reply_to_id = r.id
      LEFT JOIN users ru ON r.user_id = ru.id
      WHERE m.id > ?
      ORDER BY m.id ASC
      LIMIT ?
    `, [afterId, limit]);
  } else {
    const descRows = await db.all(`
      SELECT m.*,
             u.name AS user_name, u.username AS user_username, u.role AS user_role,
             u.access_level AS user_level, u.avatar_url AS user_avatar,
             r.message AS reply_message, r.photo_url AS reply_photo_url,
             ru.name AS reply_user_name
      FROM team_chat_messages m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN team_chat_messages r ON m.reply_to_id = r.id
      LEFT JOIN users ru ON r.user_id = ru.id
      ORDER BY m.id DESC
      LIMIT ?
    `, [limit]);
    rows = descRows.reverse();
  }

  // Also fetch active chat members (level >= 2, excluding hidden profiles)
  const chatMembers = await db.all(
    'SELECT id, name, username, role, access_level, avatar_url, last_seen_at FROM users WHERE is_approved = 1 AND (is_hidden IS NULL OR is_hidden = 0) AND access_level >= 2 ORDER BY access_level DESC, name ASC'
  );
  const membersList = chatMembers.map(u => ({
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    access_level: u.access_level,
    avatar_url: u.avatar_url,
    is_online: onlineTracker.isUserOnline(u.id),
    last_seen_formatted: onlineTracker.formatLastSeen(u.last_seen_at)
  }));

  const messages = rows.map(m => ({
    id: m.id,
    user_id: m.user_id,
    user_name: m.user_name || 'Участник',
    user_username: m.user_username || '',
    user_role: m.user_role || '',
    user_level: m.user_level || 2,
    user_avatar: m.user_avatar || null,
    message: m.message || '',
    photo_url: m.photo_url || null,
    reply_to_id: m.reply_to_id || null,
    reply_preview: m.reply_to_id ? {
      id: m.reply_to_id,
      user_name: m.reply_user_name || 'Участник',
      message: m.reply_message || (m.reply_photo_url ? '📷 Фотография' : '')
    } : null,
    created_at: m.created_at,
    is_me: m.user_id === req.user.id,
    is_online: onlineTracker.isUserOnline(m.user_id)
  }));

  res.json({
    success: true,
    messages,
    members: membersList,
    online_count: membersList.filter(m => m.is_online).length
  });
});

router.post('/team-chat', requireAuth, requireLevel(2, 'Общий чат команды доступен участникам со 2 уровня доступа.'), upload.single('photo'), async (req, res) => {
  const message = (req.body.message || '').trim();
  const replyToId = req.body.reply_to_id ? parseInt(req.body.reply_to_id, 10) : null;
  let photoUrl = null;

  if (req.file) {
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.bmp'];
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!allowedExts.includes(ext) && !(req.file.mimetype || '').startsWith('image/')) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: 'Разрешена загрузка только изображений (JPG, PNG, WEBP, GIF).' });
    }
    photoUrl = `/uploads/${req.file.filename}`;
  }

  if (!message && !photoUrl) {
    return res.status(400).json({ error: 'Введите текст сообщения или прикрепите фотографию.' });
  }

  const nowIso = new Date().toISOString();
  const insertRes = await db.run(
    `INSERT INTO team_chat_messages (user_id, message, photo_url, reply_to_id, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [req.user.id, message, photoUrl, replyToId || null, nowIso]
  );

  const created = await db.get(`
    SELECT m.*,
           u.name AS user_name, u.username AS user_username, u.role AS user_role,
           u.access_level AS user_level, u.avatar_url AS user_avatar,
           r.message AS reply_message, r.photo_url AS reply_photo_url,
           ru.name AS reply_user_name
    FROM team_chat_messages m
    LEFT JOIN users u ON m.user_id = u.id
    LEFT JOIN team_chat_messages r ON m.reply_to_id = r.id
    LEFT JOIN users ru ON r.user_id = ru.id
    WHERE m.id = ?
  `, [insertRes.lastID]);

  const formattedMessage = {
    id: created.id,
    user_id: created.user_id,
    user_name: created.user_name || req.user.name,
    user_username: created.user_username || req.user.username,
    user_role: created.user_role || req.user.role,
    user_level: created.user_level || req.user.access_level,
    user_avatar: created.user_avatar || req.user.avatar_url,
    message: created.message || '',
    photo_url: created.photo_url || null,
    reply_to_id: created.reply_to_id || null,
    reply_preview: created.reply_to_id ? {
      id: created.reply_to_id,
      user_name: created.reply_user_name || 'Участник',
      message: created.reply_message || (created.reply_photo_url ? '📷 Фотография' : '')
    } : null,
    created_at: created.created_at,
    is_me: true,
    is_online: true
  };

  res.json({
    success: true,
    message: formattedMessage
  });
});

router.delete('/team-chat/:id', requireAuth, requireLevel(2), async (req, res) => {
  const msgId = parseInt(req.params.id, 10);
  const msg = await db.get('SELECT * FROM team_chat_messages WHERE id = ?', [msgId]);
  if (!msg) {
    return res.status(404).json({ error: 'Сообщение не найдено.' });
  }

  const canDelete = (msg.user_id === req.user.id) || (req.user.access_level >= 3);
  if (!canDelete) {
    return res.status(403).json({ error: 'Удалить чужое сообщение может только руководство (3–5 уровень).' });
  }

  await db.run('DELETE FROM team_chat_messages WHERE id = ?', [msgId]);

  if (req.user.id !== msg.user_id) {
    await logAudit(req, {
      action: 'Удаление сообщения в чате',
      category: 'chat',
      target: `Сообщение #${msgId}`,
      details: `Удалено сообщение: «${(msg.message || '[Фото]').slice(0, 100)}»`
    });
  }

  res.json({ success: true });
});

// --------------------------------------------------------------------------
// 14. GUARDIAN LOGS & ANTI-DDOS SECURITY MONITOR (/api/guardian/* — Level 5)
// --------------------------------------------------------------------------

router.get('/guardian/logs', requireAuth, requireLevel(5, 'Журнал безопасности и аудита доступен только Хранителям (5 уровень).'), async (req, res) => {
  const category = (req.query.category || '').trim();
  const search = (req.query.search || '').trim().toLowerCase();
  const limit = Math.min(parseInt(req.query.limit, 10) || 250, 600);

  let auditSql = `
    SELECT a.*, u.avatar_url AS user_avatar, u.role AS user_role
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
  `;
  const auditWhere = [];
  const auditParams = [];

  if (category && category !== 'all') {
    auditWhere.push('a.category = ?');
    auditParams.push(category);
  }
  if (search) {
    auditWhere.push('(LOWER(a.action) LIKE ? OR LOWER(a.target) LIKE ? OR LOWER(a.details) LIKE ? OR LOWER(a.user_name) LIKE ? OR LOWER(a.ip) LIKE ?)');
    const q = `%${search}%`;
    auditParams.push(q, q, q, q, q);
  }
  if (auditWhere.length > 0) {
    auditSql += ' WHERE ' + auditWhere.join(' AND ');
  }
  auditSql += ' ORDER BY a.id DESC LIMIT ?';
  auditParams.push(limit);

  const auditLogs = await db.all(auditSql, auditParams);

  const connectionLogs = await db.all(`
    SELECT c.*, u.avatar_url AS user_avatar
    FROM connection_logs c
    LEFT JOIN users u ON c.user_id = u.id
    ORDER BY c.id DESC
    LIMIT 250
  `);

  const trafficSnapshot = trafficMonitor.getSnapshot();

  res.json({
    success: true,
    audit_logs: auditLogs,
    connection_logs: connectionLogs,
    traffic: trafficSnapshot
  });
});

router.post('/guardian/security/ban-ip', requireAuth, requireLevel(5), async (req, res) => {
  const ip = (req.body.ip || '').trim();
  const minutes = Math.max(1, Math.min(10080, parseInt(req.body.minutes, 10) || 60));
  const reason = (req.body.reason || 'Ручная блокировка Хранителем').trim();

  if (!ip) {
    return res.status(400).json({ error: 'Укажите IP-адрес для блокировки.' });
  }

  const callerIp = getClientIp(req);
  if (ip === callerIp || ip === '127.0.0.1' || ip === '::1') {
    return res.status(400).json({ error: 'Нельзя заблокировать собственный IP-адрес или локальный интерфейс сервера.' });
  }

  trafficMonitor.banIp(ip, reason, minutes, req.user.name);

  await logConnectionEvent({
    ip,
    userId: req.user.id,
    username: req.user.username,
    eventType: 'ip_banned',
    method: 'BAN',
    path: '/api/guardian/security/ban-ip',
    statusCode: 403,
    userAgent: req.headers['user-agent'] || '',
    details: `IP ${ip} заблокирован Хранителем ${req.user.name} на ${minutes} мин. Причина: ${reason}`
  });

  await logAudit(req, {
    action: 'Блокировка IP-адреса',
    category: 'security',
    target: `IP ${ip}`,
    details: `Срок: ${minutes} мин. Причина: ${reason}`
  });

  res.json({
    success: true,
    message: `IP-адрес ${ip} заблокирован на ${minutes} мин.`
  });
});

router.post('/guardian/security/unban-ip', requireAuth, requireLevel(5), async (req, res) => {
  const ip = (req.body.ip || '').trim();
  if (!ip) {
    return res.status(400).json({ error: 'Укажите IP-адрес для разблокировки.' });
  }

  trafficMonitor.unbanIp(ip);

  await logConnectionEvent({
    ip,
    userId: req.user.id,
    username: req.user.username,
    eventType: 'ip_unbanned',
    method: 'UNBAN',
    path: '/api/guardian/security/unban-ip',
    statusCode: 200,
    userAgent: req.headers['user-agent'] || '',
    details: `IP ${ip} разблокирован Хранителем ${req.user.name}`
  });

  await logAudit(req, {
    action: 'Разблокировка IP-адреса',
    category: 'security',
    target: `IP ${ip}`,
    details: `Блокировка снята Хранителем ${req.user.name}`
  });

  res.json({
    success: true,
    message: `Блокировка с IP-адреса ${ip} снята.`
  });
});

router.post('/guardian/logs/clear-connections', requireAuth, requireLevel(5), async (req, res) => {
  await db.run(`DELETE FROM connection_logs WHERE event_type IN ('api_mutation', 'login_success')`);
  await logAudit(req, {
    action: 'Очистка логов подключений',
    category: 'security',
    target: 'connection_logs',
    details: 'Очищены рядовые записи подключений (события угроз сохранены)'
  });
  res.json({
    success: true,
    message: 'Рядовые записи подключений очищены (предупреждения безопасности сохранены).'
  });
});

module.exports = router;
