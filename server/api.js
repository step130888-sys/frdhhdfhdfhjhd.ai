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
const { loginRateLimiter } = require('./security');

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

// Helper for wrapping dict for compatibility
function wrapUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    access_level: u.access_level,
    is_approved: Boolean(u.is_approved),
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
    return res.status(status).json({
      error: failureResult.message,
      locked: failureResult.locked,
      remaining: failureResult.remaining
    });
  }

  // Login successful: reset failed attempts counter
  loginRateLimiter.recordSuccess(req, username);

  if (!user.is_approved) {
    return res.status(403).json({
      error: 'Ваш профиль ожидает одобрения главным администратором (4 уровень). Доступ откроется после подтверждения.'
    });
  }

  res.cookie('user_id', String(user.id), {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  onlineTracker.touchUser(user);

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
  const role = (req.body.role || '').trim();
  const telegramId = (req.body.telegram_id || '').trim();

  if (!name || !username || !password || !role) {
    return res.status(400).json({ error: 'Все обязательные поля (ФИО, логин, пароль, направление) должны быть заполнены.' });
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

router.post('/auth/logout', (req, res) => {
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
    WHERE u.is_approved = 1
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
    openTasksQuery += ' AND direction = ?';
    openTasksParams.push(profileUser.role);
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

  if (!isSelf && !isLeaderOrAdmin) {
    return res.status(403).json({ error: 'Недостаточно прав для редактирования профиля.' });
  }

  // Strict protection for Level 5 (Хранитель): NOBODY can edit or change password of level 5 except himself
  if ((targetUser.access_level >= 5 || targetUser.username === db.ROOT_ADMIN_USERNAME) && !isSelf) {
    return res.status(403).json({
      error: 'Доступ запрещен. Профиль и пароль пользователя 5 уровня (Хранитель) может изменять только он сам.'
    });
  }

  // An administrator cannot change the password of another user with equal or higher access level
  if (req.body.password && targetUser.access_level >= req.user.access_level && !isSelf) {
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
  if (role) newRole = role;
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

  if (isLeaderOrAdmin && canCreateTasks !== null) {
    newCanCreate = canCreateTasks;
  }

  await db.run(
    `UPDATE users SET name = ?, username = ?, role = ?, password_hash = ?, access_level = ?, can_create_tasks = ? WHERE id = ?`,
    [newName, newUsername, newRole, newHash, newLevel, newCanCreate, profileId]
  );
  invalidateUserCache(profileId);

  const updated = await db.get('SELECT * FROM users WHERE id = ?', [profileId]);
  res.json({ success: true, user: wrapUser(updated), message: `Данные профиля «${newName}» успешно сохранены!` });
});

router.post('/users/:id/avatar', requireAuth, upload.single('avatar_file'), async (req, res) => {
  const profileId = parseInt(req.params.id, 10);
  const isSelf = (req.user.id === profileId);
  const isAdmin = (req.user.access_level >= 4);

  if (!isSelf && !isAdmin) {
    return res.status(403).json({ error: 'Недостаточно прав. Менять фото чужого профиля может только Администратор 4-го уровня.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Файл не выбран.' });
  }

  const avatarUrl = '/uploads/' + req.file.filename;
  await db.run('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, profileId]);
  invalidateUserCache(profileId);

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

  if (req.user.access_level < 2 && !req.user.can_create_tasks) {
    return res.status(403).json({ error: 'Недостаточно прав. Принудительно выдавать задачи могут руководители, главы цехов или уполномоченные участники.' });
  }

  if (req.user.access_level <= 2 && targetUser.role !== req.user.role) {
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
      const dateKey = t.event_date || (t.deadline ? t.deadline.substring(0, 10) : 'Без даты');
      if (!eventsMap.has(t.id)) {
        const ev = {
          id: t.id,
          title: t.title,
          description: t.description,
          event_date: dateKey,
          deadline: t.deadline,
          status: t.status,
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
      const dateKey = st.event_date || (st.deadline ? st.deadline.substring(0, 10) : 'Без даты');
      let foundEvent = (dateKey !== 'Без даты') ? dateToEventMap.get(dateKey) : null;
      if (!foundEvent) {
        foundEvent = {
          id: 900000 + st.id,
          title: `Событие дня (${dateKey})`,
          description: '',
          event_date: dateKey,
          deadline: st.deadline,
          status: 'in_progress',
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
  const validWorkshops = ['Фото', 'Дизайн', 'Видео', 'Моушен', 'СММ'];
  const departments = rawDepartments.filter(d => validWorkshops.includes(d));

  if (!title || !eventDate) {
    return res.status(400).json({ error: 'Укажите название мульти-задачи и дату проведения.' });
  }

  if (departments.length === 0) {
    return res.status(400).json({ error: 'Выберите хотя бы одно подразделение (от 1 до 5 цехов).' });
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
  const validWorkshops = ['Фото', 'Дизайн', 'Видео', 'Моушен', 'СММ'];
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
  // Level 2: can delete tasks in their department
  const isLeaderOrAdmin = req.user.access_level >= 3;
  const isHeadOfWorkshop = req.user.access_level === 2 && req.user.role === task.direction;

  if (!isLeaderOrAdmin && !isHeadOfWorkshop) {
    return res.status(403).json({
      error: 'Удалять задачи могут только руководители (3-5 ур.) или глава соответствующего цеха.'
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

    const canDelete = isLeaderOrAdmin || (req.user.access_level === 2 && req.user.role === task.direction);
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
  const isDirectLead = (req.user.access_level === 2);
  const canCreate = Boolean(req.user.can_create_tasks);

  if (!isLeader && !isDirectLead && !canCreate) {
    return res.status(403).json({ error: 'Недостаточно прав. Создавать задачи могут главы цехов (ур. 2), руководство (ур. 3-4) или участники с правом создания задач.' });
  }

  const title = (req.body.title || '').trim();
  const description = (req.body.description || '').trim();
  let direction = (req.body.direction || '').trim();
  const deadline = (req.body.deadline || '').trim();
  let assignedToId = req.body.assigned_to_id ? parseInt(req.body.assigned_to_id, 10) : null;

  if (!title || !description) {
    return res.status(400).json({ error: 'Заголовок и описание задачи обязательны.' });
  }

  // Level 1 or 2 can only create tasks in their own direction
  if (req.user.access_level <= 2) {
    direction = req.user.role;
  }

  if (!direction) {
    return res.status(400).json({ error: 'Укажите направление (цех) для задачи.' });
  }

  const status = assignedToId ? 'in_progress' : 'open';

  const result = await db.run(
    `INSERT INTO tasks (title, description, direction, deadline, assigned_to_id, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, description, direction, deadline || null, assignedToId, status]
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

router.post('/tasks/:id/take', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);

  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена.' });
  }

  if (task.status !== 'open') {
    return res.status(400).json({ error: 'Задача уже находится в работе или завершена.' });
  }

  if (req.user.access_level <= 2 && req.user.role !== task.direction) {
    return res.status(403).json({ error: `Вы можете брать задачи только своего направления (${req.user.role}).` });
  }

  await db.run('UPDATE tasks SET assigned_to_id = ?, status = "in_progress" WHERE id = ?', [req.user.id, taskId]);
  await db.recalculateUserStats(req.user.id);

  const nowIso = new Date().toISOString();
  await db.run(
    'INSERT INTO task_comments (task_id, user_id, message, created_at) VALUES (?, ?, ?, ?)',
    [taskId, req.user.id, `🚀 Участник ${req.user.name} (${req.user.role}) взял задачу в работу.`, nowIso]
  );

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

  res.json({ success: true, message: `Задача #${taskId} успешно принята с оценкой ${score}/10!` });
});

router.post('/tasks/:id/rework', requireAuth, requireLevel(2, 'Возвращать задачи на доработку могут главы цехов и руководство (2-4 уровень).'), async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const reworkNotes = (req.body.rework_notes || '').trim();

  if (!reworkNotes) {
    return res.status(400).json({ error: 'Пожалуйста, укажите обязательные замечания для доработки.' });
  }

  const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена.' });
  }

  if (req.user.access_level === 2 && req.user.role !== task.direction) {
    return res.status(403).json({ error: `Вы можете отправлять на доработку только задачи своего цеха (${req.user.role}).` });
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
    'СММ': 0
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
  res.json({ success: true, material: created });
});

router.delete('/materials/:id', requireAuth, requireLevel(3, 'Удалять материалы могут только руководители (3 и 4 уровень).'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.run('DELETE FROM work_materials WHERE id = ?', [id]);
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
  await db.run(
    'UPDATE users SET is_approved = 1, access_level = ? WHERE id = ?',
    [Math.max(1, Math.min(maxLevel, accessLevel)), profileId]
  );
  invalidateUserCache(profileId);

  try {
    await telegramService.notifyUserApproved(targetUser, accessLevel);
  } catch (e) {}

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

  res.json({
    success: true,
    can_create_tasks: Boolean(newStatus),
    message: newStatus ? `Право создания задач включено для ${targetUser.name}.` : `Право создания задач отключено для ${targetUser.name}.`
  });
});

router.post('/admin/users/:id/delete', requireAuth, requireLevel(4), async (req, res) => {
  const profileId = parseInt(req.params.id, 10);
  const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [profileId]);

  if (!targetUser) {
    return res.status(404).json({ error: 'Пользователь не найден.' });
  }

  if (targetUser.access_level >= 5 || targetUser.username === db.ROOT_ADMIN_USERNAME) {
    return res.status(403).json({ error: "Пользователь 5 уровня (Хранитель) защищен от удаления!" });
  }

  if (targetUser.id === req.user.id) {
    return res.status(400).json({ error: 'Вы не можете удалить свой собственный профиль во время активной сессии.' });
  }

  // Safe detachment of tasks back to 'open'
  await db.run('UPDATE tasks SET assigned_to_id = NULL, status = "open" WHERE assigned_to_id = ? AND status = "in_progress"', [profileId]);
  await db.run('UPDATE tasks SET assigned_to_id = NULL WHERE assigned_to_id = ?', [profileId]);
  await db.run('DELETE FROM users WHERE id = ?', [profileId]);
  invalidateUserCache(profileId);

  res.json({ success: true, message: `Профиль «${targetUser.name}» удален. Активные задачи возвращены в статус «open».` });
});

// --------------------------------------------------------------------------
// 9. TELEGRAM BOT SETTINGS FOR ADMINS
// --------------------------------------------------------------------------

router.get('/admin/telegram-config', requireAuth, requireLevel(4), async (req, res) => {
  const cfg = telegramService.getConfig ? telegramService.getConfig() : {};
  res.json({
    token: cfg.bot_token || '',
    group_chat_id: cfg.leadership_group_chat_id || '',
    bot_username: cfg.bot_username || 'ping_sstu_bot',
    is_active: Boolean(cfg.bot_token)
  });
});

router.post('/admin/telegram-config', requireAuth, requireLevel(4), async (req, res) => {
  const token = (req.body.token || '').trim();
  const groupChatId = (req.body.group_chat_id || '').trim();
  const botUsername = (req.body.bot_username || '').trim();

  const updates = {};
  if (token) updates.bot_token = token;
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

module.exports = router;
