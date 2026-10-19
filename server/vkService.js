const fs = require('fs');
const path = require('path');
const db = require('./db');
const { loginRateLimiter } = require('./security');
const secretVault = require('./secretVault');

const CONFIG_PATH = path.join(__dirname, 'vk_config.json');

function getConfig() {
  const defaults = {
    vk_group_token: '',
    vk_group_id: '',
    is_enabled: true
  };
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return Object.assign(defaults, data);
    } catch (e) {
      console.error('Error reading vk_config.json:', e);
    }
  }
  return defaults;
}

function saveConfig(updates) {
  const current = getConfig();
  const safeUpdates = Object.assign({}, updates);
  if (safeUpdates.vk_group_token && !secretVault.isMasked(safeUpdates.vk_group_token)) {
    safeUpdates.vk_group_token = secretVault.encryptSecret(safeUpdates.vk_group_token);
  }
  Object.assign(current, safeUpdates);
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(current, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving vk_config.json:', e);
  }
}

function getGroupToken() {
  const raw = process.env.VK_GROUP_TOKEN || getConfig().vk_group_token || '';
  return secretVault.decryptSecret(raw);
}

function getGroupId() {
  const raw = process.env.VK_GROUP_ID || getConfig().vk_group_id || '';
  const decrypted = secretVault.decryptSecret(raw);
  return String(decrypted).replace(/[^\d]/g, '');
}

const VK_BINDINGS_PATH = path.join(__dirname, 'vk_bindings.json');

function getVkBindings() {
  if (fs.existsSync(VK_BINDINGS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(VK_BINDINGS_PATH, 'utf8'));
    } catch (e) {
      console.error('[VkBot] Error reading vk_bindings.json:', e);
    }
  }
  return { byVkId: {}, byUserId: {} };
}

function saveVkBindings(data) {
  try {
    fs.writeFileSync(VK_BINDINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('[VkBot] Error saving vk_bindings.json:', e);
  }
}

function persistVkBinding(vkId, user) {
  if (!vkId || !user || !user.id) return;
  const strVkId = String(vkId).trim();
  const strUserId = String(user.id);
  const bindings = getVkBindings();
  bindings.byVkId = bindings.byVkId || {};
  bindings.byUserId = bindings.byUserId || {};

  bindings.byVkId[strVkId] = {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    access_level: user.access_level,
    updatedAt: new Date().toISOString()
  };
  bindings.byUserId[strUserId] = strVkId;
  saveVkBindings(bindings);
}

function removeVkBinding(vkIdOrUserId) {
  if (!vkIdOrUserId) return;
  const key = String(vkIdOrUserId).trim();
  const bindings = getVkBindings();
  bindings.byVkId = bindings.byVkId || {};
  bindings.byUserId = bindings.byUserId || {};

  if (bindings.byVkId[key]) {
    const uId = String(bindings.byVkId[key].userId);
    delete bindings.byVkId[key];
    delete bindings.byUserId[uId];
  }
  if (bindings.byUserId[key]) {
    const vId = bindings.byUserId[key];
    delete bindings.byUserId[key];
    delete bindings.byVkId[vId];
  }
  saveVkBindings(bindings);
}

async function findLinkedVkUser(fromId) {
  const strVkId = String(fromId).trim();

  // 1. Direct query from SQLite
  let user = await db.get(
    `SELECT * FROM users 
     WHERE vk_id = ? 
        OR CAST(vk_id AS TEXT) = ?`,
    [strVkId, strVkId]
  );

  // 2. Fallback to vk_bindings.json
  if (!user) {
    const bindings = getVkBindings();
    const entry = bindings.byVkId && bindings.byVkId[strVkId];
    if (entry && entry.userId) {
      user = await db.get('SELECT * FROM users WHERE id = ?', [entry.userId]);
      if (user) {
        // Heal SQLite
        try {
          await db.run('UPDATE users SET vk_id = NULL WHERE vk_id = ? AND id != ?', [strVkId, user.id]);
          await db.run('UPDATE users SET vk_id = ? WHERE id = ?', [strVkId, user.id]);
          user.vk_id = strVkId;
        } catch (e) {}
      }
    }
  }

  if (user && strVkId) {
    persistVkBinding(strVkId, user);
  }

  return user;
}

async function syncVkBindings() {
  try {
    const usersWithVk = await db.all('SELECT * FROM users WHERE vk_id IS NOT NULL AND vk_id != ""');
    for (const u of usersWithVk) {
      persistVkBinding(u.vk_id, u);
    }
    const bindings = getVkBindings();
    if (bindings.byVkId) {
      for (const [vId, data] of Object.entries(bindings.byVkId)) {
        if (data && data.userId && vId) {
          const usr = await db.get('SELECT * FROM users WHERE id = ?', [data.userId]);
          if (usr && !usr.vk_id) {
            await db.run('UPDATE users SET vk_id = NULL WHERE vk_id = ? AND id != ?', [vId, usr.id]);
            await db.run('UPDATE users SET vk_id = ? WHERE id = ?', [vId, usr.id]);
          }
        }
      }
    }
  } catch (e) {
    console.error('[VkBot] Sync VK bindings error:', e.message);
  }
}

/**
 * Call VK API method
 */
async function callVkApi(method, params = {}) {
  const token = getGroupToken();
  if (!token) return null;

  const url = `https://api.vk.com/method/${method}`;
  const formData = new URLSearchParams();
  formData.append('v', '5.199');
  formData.append('access_token', token);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    if (json.error) {
      const errMsg = json.error.error_msg || JSON.stringify(json.error);
      if (method === 'groups.getLongPollServer' && errMsg.includes('longpoll for this group is not enabled')) {
        console.warn('[VkBot] ⚠️ В настройках сообщества VK выключен Long Poll API! Включите: Управление -> Работа с API -> вкладка "Long Poll API" -> переключить на "Включено" (версия 5.199).');
      } else {
        console.error(`VK API error in ${method}:`, errMsg);
      }
      return null;
    }
    return json.response;
  } catch (err) {
    console.error(`Network error calling VK API ${method}:`, err.message);
    return null;
  }
}

/**
 * Resolve username/link/id to numeric user_id
 */
async function resolveNumericUserId(input) {
  if (!input) return null;
  let str = String(input).trim();
  str = str.replace(/^https?:\/\/(www\.|m\.)?vk\.(com|ru)\//i, '');
  str = str.replace(/^[/?#]+/, '');
  str = str.replace(/^@/, '');
  str = str.split('?')[0].split('#')[0].replace(/\/+$/, '');

  const idMatch = str.match(/^id(\d+)$/i);
  if (idMatch) {
    return parseInt(idMatch[1], 10);
  }
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  // 1. users.get handles numeric IDs, screen names (e.g. daniilstepanov5) automatically
  try {
    const users = await callVkApi('users.get', { user_ids: str });
    if (Array.isArray(users) && users.length > 0 && users[0].id) {
      return parseInt(users[0].id, 10);
    }
  } catch (e) {}

  // 2. Fallback to utils.resolveScreenName
  try {
    const res = await callVkApi('utils.resolveScreenName', { screen_name: str });
    if (res && res.type === 'user' && res.object_id) {
      return parseInt(res.object_id, 10);
    }
  } catch (e) {}

  return null;
}

/**
 * Get standard Read-Only reply keyboard for VK bot
 */
function getMainKeyboard() {
  return {
    one_time: false,
    buttons: [
      [
        {
          action: {
            type: 'text',
            label: '📋 Мои задачи',
            payload: JSON.stringify({ button: 'my_tasks' })
          },
          color: 'primary' // Blue
        },
        {
          action: {
            type: 'text',
            label: '🔥 Горящие дедлайны',
            payload: JSON.stringify({ button: 'urgent_deadlines' })
          },
          color: 'negative' // Red
        }
      ],
      [
        {
          action: {
            type: 'text',
            label: '🟢 Свободные задачи',
            payload: JSON.stringify({ button: 'open_tasks' })
          },
          color: 'positive' // Green
        }
      ],
      [
        {
          action: {
            type: 'text',
            label: '📊 Моя статистика',
            payload: JSON.stringify({ button: 'my_stats' })
          },
          color: 'primary' // Blue
        },
        {
          action: {
            type: 'text',
            label: '👤 Мой профиль',
            payload: JSON.stringify({ button: 'my_profile' })
          },
          color: 'secondary' // White/Grey
        }
      ],
      [
        {
          action: {
            type: 'text',
            label: 'ℹ️ Помощь',
            payload: JSON.stringify({ button: 'help' })
          },
          color: 'secondary'
        }
      ]
    ]
  };
}

/**
 * Empty reply keyboard to completely hide buttons in VK client
 */
function getEmptyKeyboard() {
  return {
    one_time: true,
    buttons: []
  };
}

/**
 * Send VK direct message to user
 * @param {string|number} userId VK user id / screen name
 * @param {string} message text content
 * @param {object|null|undefined} keyboard optional VK keyboard object. If omitted or null, no keyboard is sent.
 */
async function sendVkMessage(userId, message, keyboard = undefined) {
  if (!userId) return false;
  const token = getGroupToken();
  if (!token) return false;

  const numericId = await resolveNumericUserId(userId);
  if (!numericId) {
    console.error(`[VkBot] Не удалось определить числовой ID для пользователя: '${userId}'. Укажите цифровой ID (например, 12345678).`);
    return false;
  }

  const params = {
    user_id: numericId,
    random_id: Math.floor(Math.random() * 2147483647),
    message: message
  };

  if (keyboard !== undefined && keyboard !== null) {
    params.keyboard = keyboard;
  }

  let res = await callVkApi('messages.send', params);
  if (!res && params.keyboard) {
    // Retry without keyboard if bot keyboard features are not yet enabled in VK settings
    const fallbackParams = Object.assign({}, params);
    delete fallbackParams.keyboard;
    res = await callVkApi('messages.send', fallbackParams);
    if (res) {
      console.warn('[VkBot] ⚠️ Сообщение отправлено без кнопок, так как в группе выключены «Возможности ботов».');
      console.warn('[VkBot] 👉 Чтобы кнопки отображались: В группе откройте Управление -> Сообщения -> Настройки для бота -> Возможности ботов (Включены).');
    }
  }

  return Boolean(res);
}

/**
 * Notify assignee about newly assigned task
 */
async function notifyTaskAssigned(task, user) {
  if (!user || !user.vk_id) return false;

  const deadlineStr = task.deadline ? task.deadline.replace('T', ' ') : 'Не установлен';
  const text = [
    '📢 ВАМ НАЗНАЧЕНА НОВАЯ ЗАДАЧА!',
    '━━━━━━━━━━━━━━━━━━',
    `📌 Задача #${task.id}: «${task.title}»`,
    `🎯 Цех: ${task.direction}`,
    `⏰ Дедлайн: ${deadlineStr}`,
    `📝 Описание: ${task.description}`,
    '━━━━━━━━━━━━━━━━━━',
    '💡 Чтобы посмотреть все ваши текущие задачи и дедлайны, нажмите кнопку «📋 Мои задачи» ниже.'
  ].join('\n');

  return await sendVkMessage(user.vk_id, text);
}

/**
 * Notify assignee about forcefully assigned task from management
 */
async function notifyTaskForceAssigned(task, user, assignedBy, note = null) {
  if (!user || !user.vk_id) return false;

  const deadlineStr = task.deadline ? task.deadline.replace('T', ' ') : 'Не установлен';
  const lines = [
    '⚡ ВАМ ПРИНУДИТЕЛЬНО ВЫДАНА ЗАДАЧА!',
    '━━━━━━━━━━━━━━━━━━',
    `📌 Задача #${task.id}: «${task.title}»`,
    `🎯 Цех: ${task.direction}`,
    `👤 Назначил: ${assignedBy ? assignedBy.name : 'Руководство'} (${assignedBy ? assignedBy.role : 'Руководство'})`,
    `⏰ Дедлайн: ${deadlineStr}`,
    `📝 Техническое задание: ${task.description}`
  ];

  if (note && note.trim()) {
    lines.push(`💬 Указание руководителя: ${note.trim()}`);
  }

  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('💡 Задача уже добавлена в ваш список «В работе». Нажмите «📋 Мои задачи» для просмотра.');

  return await sendVkMessage(user.vk_id, lines.join('\n'));
}

/**
 * Notify all direction members about a new open task
 */
async function notifyNewOpenTask(task) {
  const token = getGroupToken();
  if (!token) return false;

  const users = await db.all(
    'SELECT * FROM users WHERE role = ? AND is_approved = 1 AND vk_id IS NOT NULL',
    [task.direction]
  );
  if (!users || users.length === 0) return false;

  const deadlineStr = task.deadline ? task.deadline.replace('T', ' ') : 'Не установлен';
  const text = [
    `✨ НОВАЯ СВОБОДНАЯ ЗАДАЧА В ЦЕХЕ «${task.direction}»!`,
    '━━━━━━━━━━━━━━━━━━',
    `📌 Задача #${task.id}: «${task.title}»`,
    `⏰ Дедлайн: ${deadlineStr}`,
    `📝 Описание: ${task.description}`,
    '━━━━━━━━━━━━━━━━━━',
    '🚀 Зайдите на веб-платформу, чтобы взять её в работу!'
  ].join('\n');

  for (const u of users) {
    try {
      await sendVkMessage(u.vk_id, text);
    } catch (e) {
      console.error(`Failed to send VK notification to user #${u.id}:`, e);
    }
  }
  return true;
}

/**
 * Notify assignee when task is sent to rework
 */
async function notifyTaskRework(task, user, reworkNotes = '') {
  if (!user || !user.vk_id) return false;

  const deadlineStr = task.deadline ? task.deadline.replace('T', ' ') : 'Не установлен';
  const text = [
    '🔄 ЗАДАЧА ОТПРАВЛЕНА НА ДОРАБОТКУ',
    '━━━━━━━━━━━━━━━━━━',
    `📌 Задача #${task.id}: «${task.title}»`,
    `⏰ Срок: ${deadlineStr}`,
    `⚠️ Замечания руководителя:`,
    reworkNotes || 'Пожалуйста, проверьте комментарии на платформе.',
    '━━━━━━━━━━━━━━━━━━',
    'Внесите исправления и отправьте работу повторно через сайт.'
  ].join('\n');

  return await sendVkMessage(user.vk_id, text);
}

/**
 * Notify assignee when task deadline is changed
 */
async function notifyTaskDeadlineChanged(task, user, newDeadline) {
  if (!user || !user.vk_id) return false;

  const deadlineStr = newDeadline ? newDeadline.replace('T', ' ') : 'Снят';
  const text = [
    '⏰ ИЗМЕНЕН ДЕДЛАЙН ЗАДАЧИ',
    '━━━━━━━━━━━━━━━━━━',
    `📌 Задача #${task.id}: «${task.title}»`,
    `⏰ Новый срок сдачи: ${deadlineStr}`,
    'Нажмите «🔥 Горящие дедлайны», чтобы проверить все сроки.'
  ].join('\n');

  return await sendVkMessage(user.vk_id, text);
}

/**
 * Notify recipient when a new comment is posted in task chat
 */
async function notifyTaskNewComment(task, authorUser, commentText) {
  try {
    const bindings = getVkBindings();
    const recipientId = task.assigned_to_id && task.assigned_to_id !== authorUser.id
      ? task.assigned_to_id
      : null;

    if (!recipientId) return false;
    const vkId = bindings.byUserId && bindings.byUserId[String(recipientId)];
    if (!vkId) return false;

    const text = [
      '💬 НОВОЕ СООБЩЕНИЕ В ЧАТЕ ЗАДАЧИ',
      '━━━━━━━━━━━━━━━━━━',
      `📌 Задача #${task.id}: «${task.title}»`,
      `👤 От: ${authorUser.name} (${authorUser.role || 'Команда'})`,
      `💬 Сообщение:`,
      `«${commentText}»`,
      '━━━━━━━━━━━━━━━━━━',
      'Ответьте в чате задачи на платформе СМС СГТУ.'
    ].join('\n');

    return await sendVkMessage(vkId, text);
  } catch (e) {
    return false;
  }
}

// -------------------------------------------------------------
// VK Message Handler (Read-Only)
// -------------------------------------------------------------

async function handleIncomingMessage(message) {
  if (!message || !message.from_id) return;
  const fromId = String(message.from_id);

  // Ignore group messages (negative from_id)
  if (message.from_id < 0) return;

  const rawText = (message.text || '').trim();
  const cleanText = rawText
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();

  let payload = null;
  if (message.payload) {
    try {
      payload = JSON.parse(message.payload);
    } catch (e) {}
  }

  const btnAction = payload && payload.button ? payload.button : null;

  // Find linked user with persistent bindings & auto-heal
  const user = await findLinkedVkUser(fromId);

  // Command: Account binding (/login username password or /bind username password)
  if (rawText.startsWith('/login') || rawText.startsWith('/bind')) {
    const parts = rawText.split(/\s+/);
    if (parts.length < 3) {
      await sendVkMessage(
        fromId,
        '⚠️ Для привязки укажите логин и пароль:\n/login <логин> <пароль>\n\nПример:\n/login ivan_photo 123456',
        getEmptyKeyboard()
      );
      return;
    }

    const botCheck = loginRateLimiter.checkBotAttempt(`vk_${fromId}`);
    if (!botCheck.allowed) {
      await sendVkMessage(fromId, botCheck.message, getEmptyKeyboard());
      return;
    }

    const username = parts[1].trim();
    const password = parts.slice(2).join(' ').trim();

    const candidate = await db.get('SELECT * FROM users WHERE LOWER(username) = ?', [username.toLowerCase()]);
    if (!candidate || !db.verifyPassword(password, candidate.password_hash)) {
      const fail = loginRateLimiter.recordBotFailure(`vk_${fromId}`);
      await sendVkMessage(
        fromId,
        `❌ Неверный логин или пароль.\n${fail.message}`,
        getEmptyKeyboard()
      );
      return;
    }

    loginRateLimiter.recordBotSuccess(`vk_${fromId}`);

    // Bind VK ID to user with persistent sync
    await db.run('UPDATE users SET vk_id = NULL WHERE vk_id = ? AND id != ?', [fromId, candidate.id]);
    await db.run('UPDATE users SET vk_id = ? WHERE id = ?', [fromId, candidate.id]);
    candidate.vk_id = fromId;
    persistVkBinding(fromId, candidate);

    await sendVkMessage(
      fromId,
      `✅ Успешно! Аккаунт «${candidate.name}» (Цех: ${candidate.role}) привязан к вашему ВКонтакте.\n\nТеперь вы будете получать уведомления о задачах и можете проверять сроки прямо здесь!`,
      getMainKeyboard()
    );
    return;
  }

  // 100% full silence for unauthenticated users:
  // If user is not authenticated, do not reply to any messages, clicks, or /start commands at all.
  if (!user) {
    return;
  }

  // Command: Unlink (/unlink)
  if (cleanText === '/unlink' || cleanText === 'отвязать' || cleanText === 'выйти') {
    await db.run('UPDATE users SET vk_id = NULL WHERE id = ?', [user.id]);
    removeVkBinding(fromId);
    removeVkBinding(user.id);
    await sendVkMessage(fromId, '👋 Ваш аккаунт успешно отвязан от бота. Кнопки меню скрыты.', getEmptyKeyboard());
    return;
  }

  // Command: /start, начать, старт, /menu, меню
  if (cleanText === '/start' || cleanText === 'начать' || cleanText === 'старт' || cleanText === '/menu' || cleanText === 'меню') {
    const welcome = [
      `👋 Здравствуйте, ${user.name}!`,
      '━━━━━━━━━━━━━━━━━━',
      `Вы успешно авторизованы в боте медиацентра «СМС СГТУ».`,
      `Профиль: @${user.username || 'нет'} (Цех: ${user.role}, Уровень: ${user.access_level})`,
      '',
      '🔘 Используйте кнопки внизу экрана для быстрого доступа:',
      '• 📋 «Мои задачи» — назначенные вам дела',
      '• 🔥 «Горящие дедлайны» — срочные сроки сдачи',
      '• 🟢 «Свободные задачи» — открытые задачи в контент-плане',
      '• 📊 «Моя статистика» — личный рейтинг и продуктивность',
      '• 👤 «Мой профиль» — информация об аккаунте'
    ].join('\n');
    await sendVkMessage(fromId, welcome, getMainKeyboard());
    return;
  }

  // Action 1: My Tasks (📋 Мои задачи)
  const isMyTasks = btnAction === 'my_tasks' ||
                    cleanText.includes('мои задачи') ||
                    cleanText === 'задачи' ||
                    cleanText === '/tasks' ||
                    cleanText === 'tasks' ||
                    cleanText === 'мои дела' ||
                    cleanText === 'список задач';

  if (isMyTasks) {
    const tasks = await db.all(
      `SELECT * FROM tasks 
       WHERE assigned_to_id = ? AND status != 'done' 
       ORDER BY 
         CASE WHEN deadline IS NOT NULL AND TRIM(deadline) != '' THEN 0 ELSE 1 END ASC, 
         deadline ASC, 
         id DESC`,
      [user.id]
    );

    if (!tasks || tasks.length === 0) {
      await sendVkMessage(
        fromId,
        `🎉 ${user.name}, у вас нет активных задач!\nВсе назначенные задачи закрыты или вы еще не взяли новую работу в контент-плане.`
      );
      return;
    }

    const now = new Date();
    const lines = [
      `📋 ВАШИ АКТИВНЫЕ ЗАДАЧИ (${tasks.length}):`,
      '━━━━━━━━━━━━━━━━━━'
    ];

    tasks.forEach((t, i) => {
      let statusIcon = '⏳';
      let statusName = 'В работе';
      if (t.status === 'review') {
        statusIcon = '🔍';
        statusName = 'На проверке';
      } else if (t.status === 'rework') {
        statusIcon = '🔄';
        statusName = 'На доработке';
      } else if (t.status === 'open') {
        statusIcon = '🟢';
        statusName = 'Свободна';
      }

      let deadlineInfo = '⏰ Срок: не установлен';
      if (t.deadline) {
        const dDate = new Date(t.deadline);
        const diffHours = (dDate - now) / (1000 * 60 * 60);
        const dateStr = t.deadline.replace('T', ' ');
        if (diffHours < 0) {
          deadlineInfo = `🔥 СРОК ПРОСРОЧЕН: ${dateStr}`;
        } else if (diffHours <= 48) {
          deadlineInfo = `⚡ ГОРИТ (осталось < ${Math.round(diffHours)} ч): ${dateStr}`;
        } else {
          deadlineInfo = `⏰ Дедлайн: ${dateStr}`;
        }
      }

      lines.push(`${i + 1}. #${t.id} «${t.title}»`);
      lines.push(`   ${statusIcon} Статус: ${statusName} | 🎯 Цех: ${t.direction}`);
      lines.push(`   ${deadlineInfo}`);
      if (t.rework_notes && t.status === 'rework') {
        lines.push(`   ⚠️ Замечания: ${t.rework_notes}`);
      }
      lines.push('');
    });

    lines.push('💡 Управление задачами (сдача файлов и ответы) доступно на веб-платформе.');
    await sendVkMessage(fromId, lines.join('\n'));
    return;
  }

  // Action 2: Urgent Deadlines (🔥 Горящие дедлайны)
  const isDeadlines = btnAction === 'urgent_deadlines' ||
                      cleanText.includes('дедлайн') ||
                      cleanText.includes('горящие') ||
                      cleanText === 'сроки' ||
                      cleanText === '/deadlines' ||
                      cleanText === 'deadlines' ||
                      cleanText.includes('горят');

  if (isDeadlines) {
    const tasks = await db.all(
      `SELECT * FROM tasks 
       WHERE assigned_to_id = ? AND status != 'done' AND deadline IS NOT NULL AND TRIM(deadline) != ''
       ORDER BY deadline ASC`,
      [user.id]
    );

    if (!tasks || tasks.length === 0) {
      await sendVkMessage(
        fromId,
        `✅ ${user.name}, у вас нет горящих дедлайнов!\nПо всем активным задачам сроки либо свободны, либо еще не назначены.`
      );
      return;
    }

    const now = new Date();
    const lines = [
      `🔥 ГОРЯЩИЕ ДЕДЛАЙНЫ (${tasks.length}):`,
      '━━━━━━━━━━━━━━━━━━'
    ];

    tasks.forEach((t, i) => {
      const dDate = new Date(t.deadline);
      const diffHours = (dDate - now) / (1000 * 60 * 60);
      const dateStr = t.deadline.replace('T', ' ');

      let tag = '⏰';
      if (diffHours < 0) tag = '🔥 ПРОСРОЧЕН:';
      else if (diffHours <= 24) tag = '⚡ ГОРИТ СЕГОДНЯ:';
      else if (diffHours <= 48) tag = '⚡ СРОЧНО (до 48ч):';

      lines.push(`${i + 1}. #${t.id} «${t.title}»`);
      lines.push(`   ${tag} ${dateStr}`);
      lines.push(`   Статус: ${t.status === 'rework' ? 'На доработке' : 'В работе'}`);
      lines.push('');
    });

    await sendVkMessage(fromId, lines.join('\n'));
    return;
  }

  // Action: Open / Available Tasks (🟢 Свободные задачи)
  const isOpenTasks = btnAction === 'open_tasks' ||
                      cleanText.includes('свободные') ||
                      cleanText.includes('открытые') ||
                      cleanText === '/open' ||
                      cleanText === 'open' ||
                      cleanText === 'взять задачу' ||
                      cleanText === 'доступные задачи';

  if (isOpenTasks) {
    const openTasks = await db.all(
      `SELECT * FROM tasks 
       WHERE status = 'open' 
       ORDER BY 
         CASE WHEN deadline IS NOT NULL AND TRIM(deadline) != '' THEN 0 ELSE 1 END ASC, 
         deadline ASC, 
         id DESC`
    );

    if (!openTasks || openTasks.length === 0) {
      await sendVkMessage(
        fromId,
        '🎉 В контент-плане сейчас нет свободных задач!\nВсе задачи уже распределены по участникам или успешно закрыты.'
      );
      return;
    }

    const now = new Date();
    const lines = [
      `🟢 СВОБОДНЫЕ ЗАДАЧИ В КОНТЕНТ-ПЛАНЕ (${openTasks.length}):`,
      '━━━━━━━━━━━━━━━━━━'
    ];

    openTasks.forEach((t, i) => {
      let deadlineInfo = '⏰ Срок: не установлен';
      if (t.deadline) {
        const dDate = new Date(t.deadline);
        const diffHours = (dDate - now) / (1000 * 60 * 60);
        const dateStr = t.deadline.replace('T', ' ');
        if (diffHours < 0) {
          deadlineInfo = `🔥 СРОК ПРОСРОЧЕН: ${dateStr}`;
        } else if (diffHours <= 48) {
          deadlineInfo = `⚡ ГОРИТ (осталось < ${Math.round(diffHours)} ч): ${dateStr}`;
        } else {
          deadlineInfo = `⏰ Дедлайн: ${dateStr}`;
        }
      }

      const isMyDir = (user && user.role === t.direction) ? ' ⭐ (Ваш цех!)' : '';
      lines.push(`${i + 1}. #${t.id} «${t.title}»${isMyDir}`);
      lines.push(`   🎯 Цех: ${t.direction}`);
      lines.push(`   ${deadlineInfo}`);
      if (t.description) {
        const descPreview = t.description.length > 80 ? t.description.substring(0, 77) + '...' : t.description;
        lines.push(`   📝 ТЗ: ${descPreview}`);
      }
      lines.push('');
    });

    lines.push('🚀 Чтобы взять задачу в работу, откройте Контент-план на сайте:');
    lines.push('http://localhost:8000/content-plan');
    await sendVkMessage(fromId, lines.join('\n'));
    return;
  }

  // Action: Personal Stats (📊 Моя статистика / Личная статистика)
  const isStats = btnAction === 'my_stats' ||
                  cleanText.includes('статистик') ||
                  cleanText.includes('стата') ||
                  cleanText === '/stats' ||
                  cleanText === 'моя статистика' ||
                  cleanText === 'личная статистика';

  if (isStats) {
    const inProgressCount = await db.get(
      'SELECT COUNT(*) as c FROM tasks WHERE assigned_to_id = ? AND status = "in_progress"',
      [user.id]
    );
    const reworkCount = await db.get(
      'SELECT COUNT(*) as c FROM tasks WHERE assigned_to_id = ? AND status = "rework"',
      [user.id]
    );
    const reviewCount = await db.get(
      'SELECT COUNT(*) as c FROM tasks WHERE assigned_to_id = ? AND status = "review"',
      [user.id]
    );
    const totalCompleted = user.completed_tasks || 0;
    const avgScore = Number(user.average_score || 0).toFixed(1);

    const levelTitles = {
      1: 'Участник актива',
      2: 'Глава направления',
      3: 'Руководитель медиацентра',
      4: 'Администратор системы'
    };

    const lines = [
      `📊 ЛИЧНАЯ СТАТИСТИКА: ${user.name}`,
      '━━━━━━━━━━━━━━━━━━',
      `🏷️ Цех: ${user.role} (${levelTitles[user.access_level] || 'Участник'})`,
      `🔑 Логин: @${user.username || 'нет'}`,
      '',
      `🏆 УСПЕШНОСТЬ И РЕЙТИНГ:`,
      `⭐ Средний балл: ${avgScore} / 10.0`,
      `✅ Выполнено задач: ${totalCompleted}`,
      '',
      `⏳ ТЕКУЩАЯ НАГРУЗКА:`,
      `• В работе прямо сейчас: ${inProgressCount ? inProgressCount.c : 0}`,
      `• На доработке (правки): ${reworkCount ? reworkCount.c : 0}`,
      `• На проверке у руководства: ${reviewCount ? reviewCount.c : 0}`,
      '━━━━━━━━━━━━━━━━━━',
      '💡 Сдать работу или взять новые задачи можно на веб-платформе.'
    ];

    await sendVkMessage(fromId, lines.join('\n'));
    return;
  }

  // Action 3: My Profile (👤 Мой профиль)
  const isProfile = btnAction === 'my_profile' ||
                    cleanText.includes('профиль') ||
                    cleanText === 'мой профиль' ||
                    cleanText === '/profile' ||
                    cleanText === '/me' ||
                    cleanText === 'мой аккаунт';

  if (isProfile) {
    const levelNames = {
      1: 'Участник актива',
      2: 'Глава направления',
      3: 'Руководитель медиацентра',
      4: 'Администратор системы'
    };

    const textProfile = [
      `👤 ПРОФИЛЬ: ${user.name}`,
      '━━━━━━━━━━━━━━━━━━',
      `Логин: @${user.username || 'нет'}`,
      `Цех: ${user.role}`,
      `Уровень: ${user.access_level} (${levelNames[user.access_level] || 'Участник'})`,
      `Выполнено задач: ${user.completed_tasks}`,
      `Средний балл: ${Number(user.average_score || 0).toFixed(1)} / 10.0`,
      `VK ID: ${fromId} (привязан)`,
      '━━━━━━━━━━━━━━━━━━',
      'Для отвязки отправьте: /unlink'
    ].join('\n');

    await sendVkMessage(fromId, textProfile);
    return;
  }

  // Action: Help / Default
  const helpText = [
    `Привет, ${user.name}! Вы в информационном боте Медиацентра ОСО СГТУ.`,
    '━━━━━━━━━━━━━━━━━━',
    '📌 Доступные команды (только просмотр):',
    '• 📋 «Мои задачи» — список ваших задач и их статусы',
    '• 🔥 «Горящие дедлайны» — сортировка ближайших сроков',
    '• 🟢 «Свободные задачи» — просмотр доступных задач в контент-плане',
    '• 👤 «Мой профиль» — статистика и рейтинг',
    '• 🔗 «/unlink» — отвязать страницу VK',
    '',
    'Бот работает в режиме мониторинга. Сдача материалов и проверка задач производятся через веб-платформу.'
  ].join('\n');

  await sendVkMessage(fromId, helpText);
  return;
}

// -------------------------------------------------------------
// Long Poll Polling Worker
// -------------------------------------------------------------

async function autoDetectGroupId() {
  try {
    const res = await callVkApi('groups.getById', {});
    if (res && res.groups && res.groups[0] && res.groups[0].id) {
      return String(res.groups[0].id);
    }
    if (Array.isArray(res) && res[0] && res[0].id) {
      return String(res[0].id);
    }
  } catch (e) {}
  return null;
}

class VkBotWorker {
  constructor() {
    this.isRunning = false;
    this.pollPromise = null;
    this.abortController = null;
  }

  start() {
    if (this.isRunning) return;
    const token = getGroupToken();

    if (!token) {
      console.log('[VkBot] VK Group Token не настроен. Бот ожидает настройки токена.');
      return;
    }

    this.isRunning = true;
    console.log('[VkBot] Запуск VK Long Poll worker...');
    this._runLoop();
  }

  stop() {
    this.isRunning = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    console.log('[VkBot] VK Long Poll worker остановлен.');
  }

  restart() {
    this.stop();
    setTimeout(() => {
      this.start();
    }, 1000);
  }

  async _runLoop() {
    let server = null;
    let key = null;
    let ts = null;

    while (this.isRunning) {
      const token = getGroupToken();
      let groupId = getGroupId();
      if (!token) {
        this.isRunning = false;
        break;
      }

      if (!groupId) {
        const detected = await autoDetectGroupId();
        if (detected) {
          groupId = detected;
          saveConfig({ vk_group_id: detected });
          console.log(`[VkBot] Автоматически определен Group ID: ${detected}`);
        }
      }

      if (!groupId) {
        console.log('[VkBot] Не указан и не определен VK Group ID. Ожидание настройки.');
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }

      // Step 1: Obtain or refresh Long Poll server details
      if (!server || !key || !ts) {
        try {
          const lp = await callVkApi('groups.getLongPollServer', { group_id: groupId });
          if (!lp || !lp.server || !lp.key || !lp.ts) {
            // Wait 10 seconds before retrying
            await new Promise(r => setTimeout(r, 10000));
            continue;
          }
          server = lp.server;
          key = lp.key;
          ts = lp.ts;
          console.log('[VkBot] Long Poll подключен успешно. Ожидание событий...');
        } catch (e) {
          console.error('[VkBot] Ошибка получения Long Poll сервера:', e.message);
          await new Promise(r => setTimeout(r, 10000));
          continue;
        }
      }

      // Step 2: Poll server for new events
      try {
        const pollUrl = `${server}?act=a_check&key=${key}&ts=${ts}&wait=25`;
        const res = await fetch(pollUrl);
        const data = await res.json();

        if (data.failed) {
          if (data.failed === 1) {
            ts = data.ts;
          } else {
            // Key expired or ts lost, re-request server
            server = null;
            key = null;
            ts = null;
          }
          continue;
        }

        ts = data.ts;

        if (data.updates && Array.isArray(data.updates)) {
          for (const update of data.updates) {
            if (update.type === 'message_new') {
              const msg = update.object && update.object.message ? update.object.message : update.object;
              handleIncomingMessage(msg).catch(err => {
                console.error('[VkBot] Ошибка обработки сообщения:', err);
              });
            }
          }
        }
      } catch (err) {
        if (!this.isRunning) break;
        // Network timeout / disconnect
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
}

const botWorker = new VkBotWorker();

async function initVkBot() {
  await syncVkBindings();
  botWorker.start();
}

module.exports = {
  getConfig,
  saveConfig,
  getGroupToken,
  getGroupId,
  autoDetectGroupId,
  resolveNumericUserId,
  callVkApi,
  sendVkMessage,
  getMainKeyboard,
  getEmptyKeyboard,
  notifyTaskAssigned,
  notifyTaskForceAssigned,
  notifyNewOpenTask,
  notifyTaskRework,
  notifyTaskDeadlineChanged,
  notifyTaskNewComment,
  handleIncomingMessage,
  initVkBot,
  botWorker,
  persistVkBinding,
  removeVkBinding,
  findLinkedVkUser,
  syncVkBindings,
  getVkBindings
};
