const fs = require('fs');
const path = require('path');
const db = require('./db');
const gdriveService = require('./gdriveService');
const telegramAuth = require('./telegramAuth');

const CONFIG_PATH = path.join(__dirname, 'bot_config.json');

function getConfig() {
  const defaults = {
    bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
    bot_username: process.env.TELEGRAM_BOT_USERNAME || 'ping_sstu_bot',
    leadership_group_chat_id: null,
    api_base_url: 'https://api.telegram.org',
    proxy_url: ''
  };
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return Object.assign(defaults, data);
    } catch (e) {
      console.error('Error reading bot_config.json:', e);
    }
  }
  return defaults;
}

function saveConfig(updates) {
  const current = getConfig();
  Object.assign(current, updates);
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(current, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving bot_config.json:', e);
  }
}

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || getConfig().bot_token;
}

function getBotUsername() {
  return getConfig().bot_username || 'ping_sstu_bot';
}

function getLeadershipChatId() {
  return getConfig().leadership_group_chat_id;
}

const BINDINGS_PATH = path.join(__dirname, 'telegram_bindings.json');

function getTelegramBindings() {
  if (fs.existsSync(BINDINGS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(BINDINGS_PATH, 'utf8'));
    } catch (e) {
      console.error('[TelegramBot] Error reading telegram_bindings.json:', e);
    }
  }
  return { byChatId: {}, byUserId: {} };
}

function saveTelegramBindings(data) {
  try {
    fs.writeFileSync(BINDINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('[TelegramBot] Error saving telegram_bindings.json:', e);
  }
}

function persistTelegramBinding(chatId, user) {
  if (!chatId || !user || !user.id) return;
  const strChatId = String(chatId).trim();
  const strUserId = String(user.id);
  const bindings = getTelegramBindings();
  bindings.byChatId = bindings.byChatId || {};
  bindings.byUserId = bindings.byUserId || {};

  bindings.byChatId[strChatId] = {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    access_level: user.access_level,
    updatedAt: new Date().toISOString()
  };
  bindings.byUserId[strUserId] = strChatId;
  saveTelegramBindings(bindings);
}

function removeTelegramBinding(chatIdOrUserId) {
  if (!chatIdOrUserId) return;
  const key = String(chatIdOrUserId).trim();
  const bindings = getTelegramBindings();
  bindings.byChatId = bindings.byChatId || {};
  bindings.byUserId = bindings.byUserId || {};

  if (bindings.byChatId[key]) {
    const uId = String(bindings.byChatId[key].userId);
    delete bindings.byChatId[key];
    delete bindings.byUserId[uId];
  }
  if (bindings.byUserId[key]) {
    const cId = bindings.byUserId[key];
    delete bindings.byUserId[key];
    delete bindings.byChatId[cId];
  }
  saveTelegramBindings(bindings);
}

async function findLinkedTelegramUser(chatId, tgUserId = null, tgUsername = null) {
  const strChatId = String(chatId || '').trim();
  const strUserId = tgUserId ? String(tgUserId).trim() : null;

  // 1. Direct query from SQLite by numeric/string telegram_id
  let user = await db.get(
    `SELECT * FROM users 
     WHERE telegram_id = ? 
        OR telegram_id = ? 
        OR CAST(telegram_id AS TEXT) = ? 
        OR CAST(telegram_id AS TEXT) = ?`,
    [strChatId, strUserId || strChatId, strChatId, strUserId || strChatId]
  );

  // 2. Fallback to telegram_bindings.json file
  if (!user) {
    const bindings = getTelegramBindings();
    const entry = (bindings.byChatId && (bindings.byChatId[strChatId] || (strUserId && bindings.byChatId[strUserId]))) || null;
    if (entry && entry.userId) {
      user = await db.get('SELECT * FROM users WHERE id = ?', [entry.userId]);
      if (user) {
        // Auto-heal SQLite database with current chatId
        try {
          await db.run('UPDATE users SET telegram_id = NULL WHERE telegram_id = ? AND id != ?', [strChatId, user.id]);
          await db.run('UPDATE users SET telegram_id = ? WHERE id = ?', [strChatId, user.id]);
          user.telegram_id = strChatId;
        } catch (e) {
          console.error('[TelegramBot] Auto-heal error:', e.message);
        }
      }
    }
  }

  // 3. Fallback to username matching if available
  if (!user && tgUsername) {
    const cleanU = String(tgUsername).replace('@', '').trim().toLowerCase();
    user = await db.get(
      `SELECT * FROM users 
       WHERE LOWER(telegram_id) = ? 
          OR LOWER(telegram_id) = ? 
          OR LOWER(username) = ?`,
      [`@${cleanU}`, cleanU, cleanU]
    );
    if (user) {
      try {
        await db.run('UPDATE users SET telegram_id = NULL WHERE telegram_id = ? AND id != ?', [strChatId, user.id]);
        await db.run('UPDATE users SET telegram_id = ? WHERE id = ?', [strChatId, user.id]);
        user.telegram_id = strChatId;
        persistTelegramBinding(strChatId, user);
      } catch (e) {
        console.error('[TelegramBot] Link by username error:', e.message);
      }
    }
  }

  // Ensure persistent binding file has latest info if user is found
  if (user && strChatId && (!user.telegram_id || user.telegram_id.startsWith('@'))) {
    try {
      await db.run('UPDATE users SET telegram_id = NULL WHERE telegram_id = ? AND id != ?', [strChatId, user.id]);
      await db.run('UPDATE users SET telegram_id = ? WHERE id = ?', [strChatId, user.id]);
      user.telegram_id = strChatId;
    } catch (e) {}
  }
  if (user && strChatId) {
    persistTelegramBinding(strChatId, user);
  }

  return user;
}

async function syncTelegramBindings() {
  try {
    const usersWithTg = await db.all('SELECT * FROM users WHERE telegram_id IS NOT NULL AND telegram_id != ""');
    for (const u of usersWithTg) {
      if (u.telegram_id && !u.telegram_id.startsWith('@')) {
        persistTelegramBinding(u.telegram_id, u);
      }
    }
    const bindings = getTelegramBindings();
    if (bindings.byChatId) {
      for (const [tgId, data] of Object.entries(bindings.byChatId)) {
        if (data && data.userId && tgId && !tgId.startsWith('@')) {
          const usr = await db.get('SELECT * FROM users WHERE id = ?', [data.userId]);
          if (usr && !usr.telegram_id) {
            await db.run('UPDATE users SET telegram_id = NULL WHERE telegram_id = ? AND id != ?', [tgId, usr.id]);
            await db.run('UPDATE users SET telegram_id = ? WHERE id = ?', [tgId, usr.id]);
          }
        }
      }
    }
  } catch (e) {
    console.error('[TelegramBot] Sync bindings error:', e.message);
  }
}

let cachedAgent = null;
let cachedProxy = null;

function getProxyDispatcher() {
  const cfg = getConfig();
  const proxy = (cfg.proxy_url || process.env.TELEGRAM_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '').trim();
  if (!proxy) return null;
  if (proxy === cachedProxy && cachedAgent) return cachedAgent;
  try {
    if (proxy.startsWith('socks')) {
      const { Agent } = require('undici');
      const { SocksClient } = require('socks');
      const parsed = new URL(proxy);
      cachedAgent = new Agent({
        connect(opts, cb) {
          SocksClient.createConnection({
            proxy: {
              host: parsed.hostname,
              port: Number(parsed.port) || 10808,
              type: 5,
              userId: parsed.username || undefined,
              password: parsed.password || undefined
            },
            command: 'connect',
            destination: { host: opts.host, port: Number(opts.port) }
          }, (err, info) => {
            if (err) return cb(err, null);
            cb(null, info.socket);
          });
        }
      });
      cachedProxy = proxy;
      return cachedAgent;
    }
    const { ProxyAgent } = require('undici');
    cachedAgent = new ProxyAgent(proxy);
    cachedProxy = proxy;
    return cachedAgent;
  } catch (e) {
    console.error('[TelegramBot] Failed to initialize ProxyAgent:', e.message);
    return null;
  }
}

async function callTelegramApi(method, body = {}, timeoutMs = 25000) {
  const token = getBotToken();
  if (!token) return null;
  const cfg = getConfig();
  const baseUrl = (cfg.api_base_url || 'https://api.telegram.org').trim().replace(/\/+$/, '');
  const url = `${baseUrl}/bot${token}/${method}`;

  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  };

  const dispatcher = getProxyDispatcher();
  if (dispatcher) {
    options.dispatcher = dispatcher;
  }

  try {
    const res = await fetch(url, options);
    return await res.json();
  } catch (err) {
    if (method !== 'getUpdates') {
      console.error(`Telegram API error on ${method}:`, err.message);
    }
    return null;
  }
}

function getMainReplyKeyboard(user = null) {
  const keyboard = [];

  if (user && user.is_approved) {
    keyboard.push([
      { text: '📋 Мои задачи' },
      { text: '🔥 Горящие дедлайны' }
    ]);

    if (user.access_level >= 3) {
      keyboard.push([
        { text: '📋 Задачи на проверке' },
        { text: '👥 Заявки на регистрацию' }
      ]);
      keyboard.push([
        { text: '🟢 Свободные задачи' },
        { text: '➕ Добавить участника' }
      ]);
      keyboard.push([
        { text: '👤 Мой профиль' },
        { text: '📊 Статистика медиацентра' }
      ]);
      keyboard.push([
        { text: '👑 Зарегистрировать чат' },
        { text: '🆔 Мой Chat ID' }
      ]);
      keyboard.push([
        { text: 'ℹ️ Помощь' },
        { text: '🚪 Отвязать аккаунт' }
      ]);
    } else if (user.access_level === 2) {
      keyboard.push([
        { text: '📋 Задачи на проверке' },
        { text: '🟢 Свободные задачи' }
      ]);
      keyboard.push([
        { text: '👤 Мой профиль' },
        { text: '📊 Статистика медиацентра' }
      ]);
      keyboard.push([
        { text: '🆔 Мой Chat ID' },
        { text: 'ℹ️ Помощь' }
      ]);
      keyboard.push([
        { text: '🚪 Отвязать аккаунт' }
      ]);
    } else {
      keyboard.push([
        { text: '🟢 Свободные задачи' },
        { text: '👤 Мой профиль' }
      ]);
      keyboard.push([
        { text: '🆔 Мой Chat ID' },
        { text: 'ℹ️ Помощь' }
      ]);
      keyboard.push([
        { text: '🚪 Отвязать аккаунт' }
      ]);
    }
  } else {
    keyboard.push([
      { text: '📝 Подать заявку на регистрацию' }
    ]);
    keyboard.push([
      { text: '🟢 Свободные задачи' },
      { text: '🔑 Привязать аккаунт' }
    ]);
    keyboard.push([
      { text: '🆔 Мой Chat ID' },
      { text: 'ℹ️ Помощь' }
    ]);
  }

  return {
    keyboard,
    resize_keyboard: true,
    is_persistent: true
  };
}

async function sendTelegramMessage(chatId, text, replyMarkup = null) {
  if (!chatId) return false;
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  } else if (!String(chatId).startsWith('-')) {
    try {
      const user = await db.get('SELECT * FROM users WHERE telegram_id = ?', [String(chatId)]);
      body.reply_markup = getMainReplyKeyboard(user);
    } catch (e) {
      body.reply_markup = getMainReplyKeyboard(null);
    }
  }

  const res = await callTelegramApi('sendMessage', body);
  return Boolean(res && res.ok);
}

async function testTelegramConnection() {
  const token = getBotToken();
  if (!token) {
    return { ok: false, error: 'Токен бота не настроен в bot_config.json' };
  }
  const cfg = getConfig();
  const baseUrl = (cfg.api_base_url || 'https://api.telegram.org').trim().replace(/\/+$/, '');
  const url = `${baseUrl}/bot${token}/getMe`;

  const options = {
    method: 'GET',
    signal: AbortSignal.timeout(8000)
  };
  const dispatcher = getProxyDispatcher();
  if (dispatcher) {
    options.dispatcher = dispatcher;
  }

  try {
    const res = await fetch(url, options);
    const data = await res.json();
    if (data && data.ok) {
      return { ok: true, bot: data.result, baseUrl, proxy: cfg.proxy_url || null };
    } else {
      return { ok: false, error: data?.description || 'Неизвестная ошибка Telegram API', baseUrl, proxy: cfg.proxy_url || null };
    }
  } catch (err) {
    return {
      ok: false,
      error: `Ошибка соединения: ${err.message}. (api.telegram.org недоступен напрямую с вашего провайдера).`,
      baseUrl,
      proxy: cfg.proxy_url || null,
      isNetworkError: true
    };
  }
}

async function editTelegramMessage(chatId, messageId, text, replyMarkup = null) {
  if (!chatId || !messageId) return false;
  const body = {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: 'HTML'
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  const res = await callTelegramApi('editMessageText', body);
  return Boolean(res && res.ok);
}

async function answerCallbackQuery(callbackQueryId, text = null, showAlert = false) {
  if (!callbackQueryId) return false;
  const body = {
    callback_query_id: callbackQueryId,
    show_alert: showAlert
  };
  if (text) {
    body.text = text;
  }
  const res = await callTelegramApi('answerCallbackQuery', body);
  return Boolean(res && res.ok);
}

function getRatingKeyboard(taskId, fileLink = null) {
  const gdriveFolderUrl = gdriveService.getTargetFolderUrl();
  const inline_keyboard = [
    [
      { text: '🌟 10', callback_data: `rate:${taskId}:10` },
      { text: '9', callback_data: `rate:${taskId}:9` },
      { text: '8', callback_data: `rate:${taskId}:8` },
      { text: '7', callback_data: `rate:${taskId}:7` }
    ],
    [
      { text: '6', callback_data: `rate:${taskId}:6` },
      { text: '5', callback_data: `rate:${taskId}:5` },
      { text: '4', callback_data: `rate:${taskId}:4` },
      { text: '3', callback_data: `rate:${taskId}:3` }
    ],
    [
      { text: '📁 Папка сдачи (Google Диск) ↗', url: gdriveFolderUrl }
    ]
  ];

  if (fileLink && fileLink.startsWith('https://') && !fileLink.includes('localhost') && !fileLink.includes('127.0.0.1')) {
    inline_keyboard[2].unshift({ text: '📂 Открыть файл ↗', url: fileLink });
  }

  inline_keyboard.push([
    { text: '🔄 На доработку', callback_data: `rework:${taskId}` }
  ]);

  return { inline_keyboard };
}

async function applyTaskRatingByTgUser(taskId, score, tgUserId, tgUsername) {
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) {
    return { success: false, message: `❌ Задача #${taskId} не найдена в системе.` };
  }

  if (task.status === 'done' && task.score !== null) {
    return { success: false, message: `ℹ️ Задача #${task.id} уже проверена и закрыта с оценкой ${task.score}/10.`, task };
  }

  // Find reviewer by telegram_id or username
  let grader = await findLinkedTelegramUser(tgUserId, tgUserId, tgUsername);

  if (!grader) {
    return {
      success: false,
      message: '⚠️ Ваш Telegram не привязан к аккаунту руководителя на сайте.\nНапишите боту: /bind <логин> <пароль> или нажмите «Привязать мой Telegram» в панели руководства.',
      task
    };
  }

  const isMgmt = grader.access_level >= 3;
  const isHeadOfDept = grader.access_level === 2 && grader.role === task.direction;

  if (!isMgmt && !isHeadOfDept) {
    return {
      success: false,
      message: `⛔ Недостаточно прав для оценки задачи #${task.id}.\nВаш профиль: ${grader.name} (${grader.role}, Ур. ${grader.access_level}). Оценивать могут руководители (3–4 ур.) или глава цеха '${task.direction}'.`,
      task,
      grader
    };
  }

  if (score < 1 || score > 10) {
    return { success: false, message: 'Оценка должна быть целым числом в диапазоне от 1 до 10.', task, grader };
  }

  await db.run(
    'UPDATE tasks SET score = ?, graded_by_id = ?, status = "done" WHERE id = ?',
    [score, grader.id, task.id]
  );
  task.score = score;
  task.graded_by_id = grader.id;
  task.status = 'done';

  await db.recalculateUserStats(task.assigned_to_id);

  try {
    await notifyTaskGraded(task, grader, score);
  } catch (e) {
    console.error('Error notifying assignee about grade:', e);
  }

  let assigneeName = 'Исполнитель';
  if (task.assigned_to_id) {
    const assignee = await db.get('SELECT name FROM users WHERE id = ?', [task.assigned_to_id]);
    if (assignee) assigneeName = assignee.name;
  }

  return {
    success: true,
    message: `✅ Задача #${task.id} успешно принята с оценкой ${score}/10! Рейтинг ${assigneeName} пересчитан.`,
    task,
    grader
  };
}

async function applyTaskReworkByTgUser(taskId, tgUserId, tgUsername, notes) {
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) {
    return { success: false, message: `❌ Задача #${taskId} не найдена в системе.` };
  }

  let grader = await findLinkedTelegramUser(tgUserId, tgUserId, tgUsername);

  if (!grader) {
    return {
      success: false,
      message: '⚠️ Ваш Telegram не привязан к аккаунту руководителя на сайте.\nНапишите боту: /bind <логин> <пароль>',
      task
    };
  }

  if (grader.access_level < 2) {
    return {
      success: false,
      message: `⛔ Недостаточно прав для отправки задачи #${task.id} на доработку.\nВаш профиль: ${grader.name} (${grader.role}, Ур. ${grader.access_level}).`,
      task,
      grader
    };
  }

  if (grader.access_level === 2 && grader.role !== task.direction && grader.role !== 'Руководство') {
    return {
      success: false,
      message: `⛔ Как глава цеха '${grader.role}', вы можете отправлять на доработку только задачи своего цеха (задача #${task.id} относится к '${task.direction}').`,
      task,
      grader
    };
  }

  const reworkNotes = notes && notes.trim() ? notes.trim() : 'Возвращено на доработку через Telegram';
  await db.run(
    'UPDATE tasks SET status = "rework", score = NULL, graded_by_id = NULL, rework_notes = ? WHERE id = ?',
    [reworkNotes, task.id]
  );
  task.status = 'rework';
  task.score = null;
  task.graded_by_id = null;
  task.rework_notes = reworkNotes;

  await db.recalculateUserStats(task.assigned_to_id);

  try {
    await notifyTaskRework(task, grader, reworkNotes);
  } catch (e) {
    console.error('Error notifying assignee about rework:', e);
  }

  return {
    success: true,
    message: `🔄 Задача #${task.id} отправлена на доработку.`,
    task,
    grader
  };
}

// Outgoing notification helpers
async function notifyTaskSubmittedForReview(task, user) {
  const gdriveFolderUrl = gdriveService.getTargetFolderUrl();
  const fileBadge = task.file_name ? `📎 <b>Файл:</b> <code>${task.file_name}</code>\n` : '';
  const fileLinkLine = task.file_link ? `🔗 <b>Ссылка / файл:</b> ${task.file_link}\n` : '';
  const deadlineBadge = task.deadline ? `⏰ <b>Дедлайн:</b> <code>${task.deadline.replace('T', ' ')}</code>\n` : '';

  const card = (
    '📬 <b>НОВАЯ РАБОТА НА ПРОВЕРКУ!</b>\n\n' +
    `📌 <b>Задача:</b> #${task.id} — <b>${task.title}</b>\n` +
    `📂 <b>Цех:</b> <code>${task.direction}</code>\n` +
    `👤 <b>Исполнитель:</b> ${user.name} (@${user.username || 'user_' + user.id})\n` +
    deadlineBadge +
    fileBadge +
    fileLinkLine +
    `📁 <b>Google Диск команды:</b> <a href="${gdriveFolderUrl}">Открыть папку сдачи</a>\n\n` +
    '⭐ <b>Поставьте оценку прямо здесь (1–10) или отправьте на доработку:</b>'
  );

  const kbd = getRatingKeyboard(task.id, task.file_link);
  let sentCount = 0;

  // Send to leadership group chat
  const leadGroup = getLeadershipChatId();
  if (leadGroup) {
    const ok = await sendTelegramMessage(leadGroup, card, kbd);
    if (ok) sentCount++;
  }

  // Send to individual managers (level >= 3)
  const managers = await db.all(
    'SELECT telegram_id FROM users WHERE access_level >= 3 AND telegram_id IS NOT NULL AND is_approved = 1'
  );
  for (const m of managers) {
    if (m.telegram_id && m.telegram_id !== leadGroup) {
      const ok = await sendTelegramMessage(m.telegram_id, card, kbd);
      if (ok) sentCount++;
    }
  }

  // Send to workshop head of this direction (level = 2)
  if (task.direction) {
    const workshopHeads = await db.all(
      'SELECT telegram_id FROM users WHERE access_level = 2 AND role = ? AND telegram_id IS NOT NULL AND is_approved = 1',
      [task.direction]
    );
    for (const h of workshopHeads) {
      if (h.telegram_id && h.telegram_id !== leadGroup) {
        const ok = await sendTelegramMessage(h.telegram_id, card, kbd);
        if (ok) sentCount++;
      }
    }
  }

  return sentCount;
}

async function notifyNewUserRegistered(newUser) {
  const card = (
    '🆕 <b>НОВАЯ ЗАЯВКА НА РЕГИСТРАЦИЮ!</b>\n\n' +
    `👤 <b>ФИО:</b> ${newUser.name}\n` +
    `🔑 <b>Логин:</b> <code>@${newUser.username}</code>\n` +
    `🏷️ <b>Цех / Направление:</b> <b>${newUser.role}</b>\n` +
    `✈️ <b>Telegram:</b> ${newUser.telegram_id || 'не указан'}\n\n` +
    'Нажмите кнопку ниже, чтобы одобрить заявку в 1 клик прямо из Telegram:'
  );

  const kbd = {
    inline_keyboard: [
      [
        { text: '✅ Одобрить (Участник)', callback_data: `approve_user:${newUser.id}:1` },
        { text: '👑 Одобрить (Глава цеха)', callback_data: `approve_user:${newUser.id}:2` }
      ],
      [
        { text: '❌ Отклонить', callback_data: `reject_user:${newUser.id}` }
      ]
    ]
  };

  const admins = await db.all(
    'SELECT telegram_id FROM users WHERE access_level >= 3 AND telegram_id IS NOT NULL AND is_approved = 1'
  );
  let sentCount = 0;
  for (const a of admins) {
    if (a.telegram_id) {
      const ok = await sendTelegramMessage(a.telegram_id, card, kbd);
      if (ok) sentCount++;
    }
  }
  return sentCount;
}

async function notifyTaskGraded(task, arg2, arg3, arg4) {
  let assignee, reviewer, score;
  if (arg4 !== undefined) {
    assignee = arg2;
    reviewer = arg3;
    score = arg4;
  } else {
    reviewer = arg2;
    score = arg3;
    if (task.assigned_to_id) {
      assignee = await db.get('SELECT * FROM users WHERE id = ?', [task.assigned_to_id]);
    }
  }
  if (!assignee || !assignee.telegram_id) return false;

  const card = (
    '🎉 <b>ВАША РАБОТА ПРИНЯТА И ОЦЕНЕНА!</b>\n\n' +
    `📌 <b>Задача:</b> #${task.id} — <b>${task.title}</b>\n` +
    `📂 <b>Цех:</b> <code>${task.direction}</code>\n` +
    `⭐ <b>Оценка:</b> <b>${score} / 10</b>\n` +
    `👑 <b>Проверил:</b> ${reviewer ? reviewer.name : 'Руководство'} (${reviewer ? reviewer.role : 'Руководитель'})\n` +
    `📊 <b>Ваш новый средний балл:</b> <b>${assignee.average_score != null ? assignee.average_score.toFixed(1) : '—'} / 10.0</b>\n` +
    `✅ <b>Закрыто задач:</b> ${assignee.completed_tasks || 0}\n\n` +
    '<i>Отличная работа! Продолжайте в том же духе.</i>'
  );
  return await sendTelegramMessage(assignee.telegram_id, card);
}

async function notifyTaskRework(task, arg2, arg3, arg4) {
  let assignee, reviewer, notes;
  if (arg4 !== undefined) {
    assignee = arg2;
    reviewer = arg3;
    notes = arg4;
  } else {
    reviewer = arg2;
    notes = arg3;
    if (task.assigned_to_id) {
      assignee = await db.get('SELECT * FROM users WHERE id = ?', [task.assigned_to_id]);
    }
  }
  if (!assignee || !assignee.telegram_id) return false;

  const notesText = notes ? `\n📝 <b>Замечания руководителя:</b>\n<i>${notes}</i>\n` : '';
  const card = (
    '⚠️ <b>ЗАДАЧА ОТПРАВЛЕНА НА ДОРАБОТКУ</b>\n\n' +
    `📌 <b>Задача:</b> #${task.id} — <b>${task.title}</b>\n` +
    `📂 <b>Цех:</b> <code>${task.direction}</code>\n` +
    `👑 <b>Руководитель:</b> ${reviewer ? reviewer.name : 'Руководство'} (${reviewer ? reviewer.role : 'Руководитель'})\n` +
    notesText + '\n' +
    '⚡ <i>Пожалуйста, внесите необходимые исправления и загрузите обновленный результат на сайте.</i>'
  );
  return await sendTelegramMessage(assignee.telegram_id, card);
}

async function notifyTaskForceAssigned(task, assignee, assigner, note = null) {
  if (!assignee || !assignee.telegram_id) return false;

  const deadlineStr = task.deadline ? task.deadline.replace('T', ' ') : 'Не установлен';
  const noteText = note && note.trim() ? `\n💬 <b>Указание руководителя:</b>\n<i>${note.trim()}</i>\n` : '';

  const card = (
    '⚡ <b>ВАМ ПРИНУДИТЕЛЬНО ВЫДАНА ЗАДАЧА!</b>\n\n' +
    `📌 <b>Задача:</b> #${task.id} — <b>${task.title}</b>\n` +
    `📂 <b>Цех:</b> <code>${task.direction}</code>\n` +
    `👤 <b>Назначил:</b> <b>${assigner ? assigner.name : 'Руководство'}</b> (${assigner ? assigner.role : 'Руководство'})\n` +
    `⏰ <b>Дедлайн:</b> <code>${deadlineStr}</code>\n` +
    `📝 <b>Техническое задание:</b>\n${task.description}\n` +
    noteText + '\n' +
    `🌐 <a href="http://localhost:8000/task/${task.id}">Открыть задачу на платформе</a>`
  );

  return await sendTelegramMessage(assignee.telegram_id, card);
}

async function notifyTaskComment(task, author, commentText) {
  let sentCount = 0;
  const messageCard = (
    '💬 <b>НОВОЕ СООБЩЕНИЕ В ЧАТЕ ЗАДАЧИ!</b>\n\n' +
    `📌 <b>Задача #${task.id}:</b> <i>${task.title}</i> (${task.direction})\n` +
    `👤 <b>Отправитель:</b> <b>${author.name}</b> (${author.role}, Ур. ${author.access_level})\n\n` +
    `✉️ <b>Сообщение:</b>\n«${commentText}»\n\n` +
    `🌐 <a href="http://localhost:8000/task/${task.id}#comments">Открыть диалог по задаче на сайте</a>`
  );

  // If author is assignee -> notify managers
  if (task.assigned_to_id === author.id) {
    const managers = await db.all(
      'SELECT telegram_id FROM users WHERE access_level >= 3 AND telegram_id IS NOT NULL'
    );
    for (const m of managers) {
      if (m.telegram_id && m.telegram_id !== author.telegram_id) {
        const ok = await sendTelegramMessage(m.telegram_id, messageCard);
        if (ok) sentCount++;
      }
    }
  } else {
    // Author is manager -> notify assignee
    if (task.assigned_to_id) {
      const assignee = await db.get('SELECT telegram_id FROM users WHERE id = ?', [task.assigned_to_id]);
      if (assignee && assignee.telegram_id && assignee.telegram_id !== author.telegram_id) {
        const ok = await sendTelegramMessage(assignee.telegram_id, messageCard);
        if (ok) sentCount++;
      }
    }
  }
  return sentCount;
}

async function sendTestNotification(chatId = null) {
  const target = chatId || getLeadershipChatId();
  if (!target) return false;
  const text = (
    '🔔 <b>ТЕСТОВОЕ ОПОВЕЩЕНИЕ МЕДИАЦЕНТРА</b>\n\n' +
    '✅ Связь платформы с Telegram-ботом работает корректно!\n' +
    '🚀 Система переведена на высокопроизводительный Node.js движок.\n' +
    '⚡ Оценки, комментарии и материалы синхронизируются мгновенно.'
  );
  return await sendTelegramMessage(target, text);
}

async function notifyUserApproved(user, accessLevel) {
  if (!user || !user.telegram_id) return false;
  const card = (
    '🎉 <b>ВАША УЧЕТНАЯ ЗАПИСЬ ОДОБРЕНА!</b>\n\n' +
    `👤 <b>Пользователь:</b> ${user.name}\n` +
    `🏷️ <b>Цех / Направление:</b> ${user.role}\n` +
    `⭐ <b>Уровень доступа:</b> ${accessLevel}\n\n` +
    '✅ Теперь вам доступны все рабочие разделы медиацентра СГТУ!'
  );
  return await sendTelegramMessage(user.telegram_id, card, getMainReplyKeyboard(user));
}

const notifyTaskSubmitted = notifyTaskSubmittedForReview;
const notifyTaskNewComment = notifyTaskComment;

// Telegram Worker class with long polling
class TelegramBotWorker {
  constructor() {
    this.running = false;
    this.offset = 0;
  }

  async start() {
    if (this.running) return;
    this.running = true;
    console.log('[TelegramBot] Starting Telegram bot polling worker...');
    try {
      await callTelegramApi('deleteWebhook', { drop_pending_updates: true }, 10000);
    } catch (e) {
      console.warn('[TelegramBot] Warning during deleteWebhook:', e.message);
    }
    this.pollLoop();
  }

  stop() {
    this.running = false;
    console.log('[TelegramBot] Telegram bot worker stopped.');
  }

  async pollLoop() {
    let consecutiveErrors = 0;
    while (this.running) {
      try {
        const token = getBotToken();
        if (!token) {
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

        const res = await callTelegramApi('getUpdates', {
          offset: this.offset,
          timeout: 20
        }, 30000);

        if (res && res.ok && Array.isArray(res.result)) {
          consecutiveErrors = 0;
          for (const update of res.result) {
            this.offset = update.update_id + 1;
            await this.handleUpdate(update);
          }
        } else {
          if (!res) {
            consecutiveErrors++;
            if (consecutiveErrors === 1 || consecutiveErrors % 15 === 0) {
              console.warn(`[TelegramBot] getUpdates failed (${consecutiveErrors} раз подряд). Провайдер блокирует api.telegram.org:443. Требуется VPN, прокси или зеркало.`);
            }
            const delay = Math.min(15000, 3000 + consecutiveErrors * 1000);
            await new Promise(r => setTimeout(r, delay));
          } else {
            consecutiveErrors = 0;
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      } catch (err) {
        consecutiveErrors++;
        if (consecutiveErrors === 1 || consecutiveErrors % 15 === 0) {
          console.warn('[TelegramBot] Polling loop error:', err.message);
        }
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  async handleUpdate(update) {
    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    } else if (update.message) {
      await this.handleMessage(update.message);
    }
  }

  async handleCallbackQuery(cb) {
    const cbId = cb.id;
    const cbData = cb.data || '';
    const fromUser = cb.from || {};
    const tgUserId = String(fromUser.id);
    const tgUsername = fromUser.username;
    const msg = cb.message;

    if (cbData === 'cmd:myid') {
      await answerCallbackQuery(cbId, `🆔 Ваш Chat ID: ${tgUserId}`, true);
      return;
    }

    if (cbData === 'cmd:ask_unbind') {
      await answerCallbackQuery(cbId);
      const kbd = {
        inline_keyboard: [
          [
            { text: '⚠️ Да, отвязать', callback_data: 'cmd:do_unbind' },
            { text: '❌ Отмена', callback_data: 'cmd:cancel_unbind' }
          ]
        ]
      };
      if (msg) {
        await sendTelegramMessage(String(msg.chat.id), '❓ <b>Вы уверены, что хотите отвязать Telegram?</b>\nОповещения о дедлайнах и задачах будут отключены.', kbd);
      }
      return;
    }

    if (cbData === 'cmd:do_unbind') {
      const chatId = msg ? String(msg.chat.id) : tgUserId;
      const usr = await findLinkedTelegramUser(chatId, tgUserId, tgUsername);
      if (usr) {
        await db.run('UPDATE users SET telegram_id = NULL WHERE id = ?', [usr.id]);
        removeTelegramBinding(chatId);
        removeTelegramBinding(usr.id);
        await answerCallbackQuery(cbId, '✅ Аккаунт отвязан!');
        await sendTelegramMessage(chatId, `✅ Аккаунт <b>${usr.name}</b> успешно отвязан.`, getMainReplyKeyboard(null));
      } else {
        await answerCallbackQuery(cbId, 'Аккаунт не привязан', true);
      }
      return;
    }

    if (cbData === 'cmd:cancel_unbind') {
      await answerCallbackQuery(cbId, 'Отменено');
      if (msg) {
        await editTelegramMessage(String(msg.chat.id), msg.message_id, '✅ Отвязка аккаунта отменена.', { inline_keyboard: [] });
      }
      return;
    }

    if (cbData.startsWith('rework:')) {
      const parts = cbData.split(':');
      if (parts.length !== 2 || isNaN(parts[1])) {
        await answerCallbackQuery(cbId, 'Некорректный запрос', true);
        return;
      }
      const taskId = parseInt(parts[1], 10);
      const res = await applyTaskReworkByTgUser(taskId, tgUserId, tgUsername, 'Возвращено на доработку через Telegram');
      if (!res.success) {
        await answerCallbackQuery(cbId, res.message, true);
        return;
      }
      await answerCallbackQuery(cbId, `🔄 Задача #${taskId} отправлена на доработку!`);
      if (msg) {
        const chatId = String(msg.chat.id);
        const messageId = msg.message_id;
        const assignee = res.task.assigned_to_id ? await db.get('SELECT name FROM users WHERE id = ?', [res.task.assigned_to_id]) : null;
        const assigneeName = assignee ? assignee.name : 'Исполнитель';
        const cardUpdated = (
          '🔄 <b>ЗАДАЧА ОТПРАВЛЕНА НА ДОРАБОТКУ!</b>\n\n' +
          `📌 <b>Задача:</b> #${res.task.id} — <b>${res.task.title}</b>\n` +
          `📂 <b>Цех:</b> <code>${res.task.direction}</code>\n` +
          `👤 <b>Исполнитель:</b> ${assigneeName}\n` +
          `👑 <b>Отправил:</b> ${res.grader.name} (${res.grader.role})\n\n` +
          '⚡ <i>Исполнителю направлено уведомление о необходимости правок.</i>'
        );
        await editTelegramMessage(chatId, messageId, cardUpdated, { inline_keyboard: [] });
      }
      return;
    }

    if (cbData.startsWith('rate:')) {
      const parts = cbData.split(':');
      if (parts.length !== 3) {
        await answerCallbackQuery(cbId, 'Некорректный запрос', true);
        return;
      }
      const taskId = parseInt(parts[1], 10);
      const score = parseInt(parts[2], 10);
      const res = await applyTaskRatingByTgUser(taskId, score, tgUserId, tgUsername);
      if (!res.success) {
        await answerCallbackQuery(cbId, res.message, true);
        return;
      }

      await answerCallbackQuery(cbId, `✅ Оценка ${score}/10 сохранена!`);
      if (msg) {
        const chatId = String(msg.chat.id);
        const messageId = msg.message_id;
        const assignee = res.task.assigned_to_id ? await db.get('SELECT * FROM users WHERE id = ?', [res.task.assigned_to_id]) : null;
        const assigneeName = assignee ? assignee.name : 'Исполнитель';
        const avgScoreStr = assignee ? assignee.average_score.toFixed(1) : '—';

        const fileButton = {
          inline_keyboard: [[
            { text: '📁 Папка Google Диска ↗', url: gdriveService.getTargetFolderUrl() }
          ]]
        };
        if (res.task.file_link && res.task.file_link.startsWith('https://') && !res.task.file_link.includes('localhost') && !res.task.file_link.includes('127.0.0.1')) {
          fileButton.inline_keyboard[0].unshift({ text: '📂 Открыть файл ↗', url: res.task.file_link });
        }

        const cardUpdated = (
          '✅ <b>ЗАДАЧА ПРИНЯТА И ОЦЕНЕНА!</b>\n\n' +
          `📌 <b>Задача:</b> #${res.task.id} — <b>${res.task.title}</b>\n` +
          `📂 <b>Цех:</b> <code>${res.task.direction}</code>\n` +
          `👤 <b>Исполнитель:</b> ${assigneeName}\n` +
          `⭐ <b>Выставленная оценка:</b> <b>${score} / 10</b>\n` +
          `👑 <b>Проверил:</b> ${res.grader.name} (${res.grader.role})\n` +
          `📊 <b>Новый рейтинг исполнителя:</b> <b>${avgScoreStr} / 10.0</b>\n\n` +
          '⚡ <i>Синхронизировано с сайтом медиацентра в реальном времени.</i>'
        );
        await editTelegramMessage(chatId, messageId, cardUpdated, fileButton);
      }
      return;
    }

    // 3. reg_dept:DIRECTION (Candidate Registration from Telegram)
    if (cbData.startsWith('reg_dept:')) {
      const direction = cbData.split(':')[1].trim();
      const applicantName = [fromUser.first_name, fromUser.last_name].filter(Boolean).join(' ') || fromUser.first_name || 'Новый участник';
      const cleanUsername = tgUsername ? tgUsername.replace('@', '').toLowerCase() : `tg_${tgUserId.slice(-5)}`;

      let existingUser = await db.get('SELECT * FROM users WHERE telegram_id = ? OR LOWER(username) = ?', [tgUserId, cleanUsername]);
      if (existingUser) {
        if (existingUser.is_approved) {
          await answerCallbackQuery(cbId, `Вы уже зарегистрированы как ${existingUser.name}!`);
          await sendTelegramMessage(String(fromUser.id), `✅ Вы уже являетесь участником медиацентра: <b>${existingUser.name}</b> (${existingUser.role}).`, getMainReplyKeyboard(existingUser));
          return;
        } else {
          await answerCallbackQuery(cbId, 'Ваша заявка уже на рассмотрении!');
          await sendTelegramMessage(String(fromUser.id), `⏳ Ваша заявка в цех <b>${existingUser.role}</b> уже находится на рассмотрении руководства медиацентра.`);
          return;
        }
      }

      const defaultPassHash = db.hashPassword('kedr2026');
      const insRes = await db.run(
        `INSERT INTO users (name, username, password_hash, telegram_id, role, access_level, is_approved, completed_tasks, average_score)
         VALUES (?, ?, ?, ?, ?, 1, 0, 0, 0.0)`,
        [applicantName, cleanUsername, defaultPassHash, tgUserId, direction]
      );
      const newUserId = insRes.lastID;

      await answerCallbackQuery(cbId, '🎉 Заявка принята!');

      const applicantCard = (
        '🎉 <b>ЗАЯВКА НА ВСТУПЛЕНИЕ УСПЕШНО ОТПРАВЛЕНА!</b>\n\n' +
        `👤 <b>ФИО:</b> ${applicantName}\n` +
        `🔑 <b>Логин:</b> <code>@${cleanUsername}</code>\n` +
        `🏷️ <b>Выбранный цех:</b> <b>${direction}</b>\n` +
        `✈️ <b>Telegram:</b> @${cleanUsername} (ID: <code>${tgUserId}</code>)\n\n` +
        '⏳ <i>Заявка поступила руководству медиацентра. Как только администратор подтвердит ваш профиль, бот пришлет вам уведомление и откроет доступ к задачам!</i>'
      );
      await sendTelegramMessage(String(fromUser.id), applicantCard);

      // Notify all admins and leaders with 1-click approval buttons
      const adminNotice = (
        '🆕 <b>НОВАЯ ЗАЯВКА НА ВСТУПЛЕНИЕ В МЕДИАЦЕНТР!</b>\n\n' +
        `👤 <b>Кандидат:</b> ${applicantName}\n` +
        `🔑 <b>Логин:</b> <code>@${cleanUsername}</code>\n` +
        `🏷️ <b>Цех:</b> <b>${direction}</b>\n` +
        `✈️ <b>Telegram:</b> @${cleanUsername} (ID: <code>${tgUserId}</code>)\n\n` +
        'Нажмите кнопку ниже, чтобы одобрить заявку в 1 клик:'
      );
      const adminKeyboard = {
        inline_keyboard: [
          [
            { text: '✅ Одобрить (Участник)', callback_data: `approve_user:${newUserId}:1` },
            { text: '👑 Одобрить (Глава цеха)', callback_data: `approve_user:${newUserId}:2` }
          ],
          [
            { text: '❌ Отклонить', callback_data: `reject_user:${newUserId}` }
          ]
        ]
      };

      const adminsAndLeads = await db.all(
        'SELECT telegram_id FROM users WHERE access_level >= 3 AND telegram_id IS NOT NULL AND is_approved = 1'
      );
      for (const a of adminsAndLeads) {
        if (a.telegram_id && a.telegram_id !== tgUserId) {
          await sendTelegramMessage(a.telegram_id, adminNotice, adminKeyboard);
        }
      }
      return;
    }

    // 4. approve_user:USER_ID:LEVEL (Admin approval in 1 click)
    if (cbData.startsWith('approve_user:')) {
      const parts = cbData.split(':');
      if (parts.length !== 3) {
        await answerCallbackQuery(cbId, 'Некорректный запрос', true);
        return;
      }
      const targetUserId = parseInt(parts[1], 10);
      const accessLevel = parseInt(parts[2], 10) || 1;

      let adminUser = await db.get('SELECT * FROM users WHERE telegram_id = ?', [String(tgUserId)]);
      if (!adminUser && tgUsername) {
        adminUser = await db.get('SELECT * FROM users WHERE LOWER(username) = ?', [tgUsername.replace('@', '').toLowerCase()]);
      }
      if (!adminUser || adminUser.access_level < 3) {
        await answerCallbackQuery(cbId, '⛔ Только руководство и администраторы (3–4 ур.) могут одобрять заявки.', true);
        return;
      }

      const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [targetUserId]);
      if (!targetUser) {
        await answerCallbackQuery(cbId, '❌ Пользователь не найден или уже удален.', true);
        return;
      }

      if (targetUser.is_approved) {
        await answerCallbackQuery(cbId, `ℹ️ Пользователь ${targetUser.name} уже одобрен.`);
        if (msg) {
          await editTelegramMessage(String(msg.chat.id), msg.message_id, `ℹ️ Пользователь <b>${targetUser.name}</b> уже одобрен (Ур. ${targetUser.access_level}).`, { inline_keyboard: [] });
        }
        return;
      }

      await db.run('UPDATE users SET is_approved = 1, access_level = ? WHERE id = ?', [accessLevel, targetUserId]);
      targetUser.is_approved = 1;
      targetUser.access_level = accessLevel;

      await answerCallbackQuery(cbId, `✅ Пользователь ${targetUser.name} одобрен!`);

      if (msg) {
        const adminChatId = String(msg.chat.id);
        const approvedCard = (
          '✅ <b>ЗАЯВКА УСПЕШНО ОДОБРЕНА!</b>\n\n' +
          `👤 <b>Пользователь:</b> ${targetUser.name}\n` +
          `🔑 <b>Логин:</b> <code>@${targetUser.username}</code>\n` +
          `🏷️ <b>Цех:</b> <b>${targetUser.role}</b>\n` +
          `⭐ <b>Уровень доступа:</b> <b>${accessLevel}</b> (${accessLevel === 2 ? 'Глава цеха' : 'Участник'})\n` +
          `👑 <b>Одобрил:</b> ${adminUser.name} (${adminUser.role})\n\n` +
          '⚡ <i>Пользователю открыт доступ на сайте и отправлено уведомление с кнопками бота.</i>'
        );
        await editTelegramMessage(adminChatId, msg.message_id, approvedCard, { inline_keyboard: [] });
      }

      // Notify applicant in Telegram
      if (targetUser.telegram_id) {
        const welcomeText = (
          '🎉 <b>ВАША ЗАЯВКА ОДОБРЕНА РУКОВОДСТВОМ!</b>\n\n' +
          `👋 Здравствуйте, <b>${targetUser.name}</b>!\n` +
          'Вы официально приняты в команду медиацентра <b>«СМС СГТУ»</b>.\n\n' +
          `🏷️ <b>Цех:</b> <code>${targetUser.role}</code>\n` +
          `⭐ <b>Уровень доступа:</b> <b>${accessLevel}</b> (${accessLevel === 2 ? 'Глава цеха' : 'Участник'})\n` +
          `🔑 <b>Логин:</b> <code>@${targetUser.username}</code>\n\n` +
          '✅ <b>Внизу экрана активированы рабочие плашки!</b>\n' +
          'Теперь вы можете брать свободные задачи, сдавать готовые материалы и получать оценки руководства.'
        );
        await sendTelegramMessage(targetUser.telegram_id, welcomeText, getMainReplyKeyboard(targetUser));
      }
      return;
    }

    // 5. reject_user:USER_ID (Admin rejection in 1 click)
    if (cbData.startsWith('reject_user:')) {
      const parts = cbData.split(':');
      if (parts.length !== 2) {
        await answerCallbackQuery(cbId, 'Некорректный запрос', true);
        return;
      }
      const targetUserId = parseInt(parts[1], 10);

      let adminUser = await db.get('SELECT * FROM users WHERE telegram_id = ?', [String(tgUserId)]);
      if (!adminUser && tgUsername) {
        adminUser = await db.get('SELECT * FROM users WHERE LOWER(username) = ?', [tgUsername.replace('@', '').toLowerCase()]);
      }
      if (!adminUser || adminUser.access_level < 3) {
        await answerCallbackQuery(cbId, '⛔ Только руководство и администраторы (3–4 ур.) могут отклонять заявки.', true);
        return;
      }

      const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [targetUserId]);
      if (!targetUser) {
        await answerCallbackQuery(cbId, 'Пользователь не найден.', true);
        return;
      }

      const candidateTg = targetUser.telegram_id;
      const candidateName = targetUser.name;
      await db.run('DELETE FROM users WHERE id = ? AND is_approved = 0', [targetUserId]);

      await answerCallbackQuery(cbId, `❌ Заявка ${candidateName} отклонена.`);

      if (msg) {
        const adminChatId = String(msg.chat.id);
        const rejectedCard = (
          '❌ <b>ЗАЯВКА ОТКЛОНЕНА</b>\n\n' +
          `👤 <b>Кандидат:</b> ${candidateName} (@${targetUser.username})\n` +
          `🏷️ <b>Цех:</b> ${targetUser.role}\n` +
          `👑 <b>Отклонил:</b> ${adminUser.name} (${adminUser.role})`
        );
        await editTelegramMessage(adminChatId, msg.message_id, rejectedCard, { inline_keyboard: [] });
      }

      if (candidateTg) {
        await sendTelegramMessage(
          candidateTg,
          '❌ <b>Ваша заявка на регистрацию в медиацентр была отклонена руководством.</b>\n' +
          'Если произошла ошибка, свяжитесь с руководителем напрямую.'
        );
      }
      return;
    }

    await answerCallbackQuery(cbId);
  }

  async handleMessage(message) {
    const chat = message.chat || {};
    const chatId = String(chat.id);
    const rawText = (message.text || '').trim();
    const fromUser = message.from || {};
    const tgUserId = String(fromUser.id);
    const tgUsername = fromUser.username;
    const userName = fromUser.first_name || 'Участник';

    const document = message.document;
    const photo = message.photo;
    const video = message.video;

    if (!rawText && !document && !photo && !video) return;

    if (document || photo || video) {
      await this.handleFileSubmission(message, chatId, tgUserId, tgUsername, userName);
      return;
    }

    // Find linked user with double persistence & auto-heal
    let linkedUser = await findLinkedTelegramUser(chatId, tgUserId, tgUsername);

    // Normalize text (lower case, remove emojis)
    const cleanText = rawText
      .toLowerCase()
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();

    // 1. /start login_TOKEN (1-click Web Login)
    if (rawText.startsWith('/start login_')) {
      const token = rawText.split('login_')[1].trim();
      const session = telegramAuth.getSession(token);
      if (!session) {
        await sendTelegramMessage(chatId, '⚠️ Срок действия ссылки входа истек. Нажмите «Войти через Telegram» на сайте заново.');
        return;
      }

      let user = linkedUser || (await findLinkedTelegramUser(chatId, tgUserId, tgUsername));

      if (!user) {
        telegramAuth.setPendingTg(token, {
          id: chatId,
          username: tgUsername || null,
          name: userName || 'Пользователь'
        });
        await sendTelegramMessage(
          chatId,
          `👋 Здравствуйте, <b>${userName}</b>!\n\n` +
          'Ваш Telegram еще не привязан к аккаунту на сайте СМС СГТУ.\n\n' +
          'Чтобы завершить вход в один клик, напишите боту команду:\n' +
          '<code>/bind &lt;ваш_логин&gt; &lt;ваш_пароль&gt;</code>\n\n' +
          'Или введите логин и пароль в открытом окне на сайте — профиль привяжется автоматически!'
        );
        return;
      }

      if (!user.is_approved) {
        telegramAuth.setSessionError(token, 'Ваш профиль ожидает одобрения главным администратором (4 уровень).');
        await sendTelegramMessage(chatId, `⏳ Здравствуйте, <b>${user.name}</b>!\nВаш профиль еще ожидает подтверждения администратором.`);
        return;
      }

      persistTelegramBinding(chatId, user);
      telegramAuth.completeSession(token, user);

      const kbd = getMainReplyKeyboard(user);
      const reply = (
        '🎉 <b>УСПЕШНЫЙ ВХОД НА САЙТ В 1 КЛИК!</b>\n\n' +
        `👤 <b>Пользователь:</b> ${user.name}\n` +
        `🔑 <b>Логин:</b> <code>@${user.username}</code>\n` +
        `🏷️ <b>Цех:</b> ${user.role} (Уровень ${user.access_level})\n\n` +
        '✅ Авторизация в браузере завершена. Окно входа на сайте закрылось автоматически!'
      );
      await sendTelegramMessage(chatId, reply, kbd);
      return;
    }

    // 2. /start bind_ID (1-click Account Linking)
    if (rawText.startsWith('/start bind_')) {
      const uidStr = rawText.split('bind_')[1].trim();
      const uid = parseInt(uidStr, 10);
      if (!isNaN(uid)) {
        const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [uid]);
        if (targetUser) {
          await db.run('UPDATE users SET telegram_id = NULL WHERE telegram_id = ? AND id != ?', [chatId, targetUser.id]);
          await db.run('UPDATE users SET telegram_id = ? WHERE id = ?', [chatId, targetUser.id]);
          targetUser.telegram_id = chatId;
          persistTelegramBinding(chatId, targetUser);
          telegramAuth.completePendingSessionByTg(chatId, targetUser);
          const kbd = getMainReplyKeyboard(targetUser);
          const reply = (
            '🎉 <b>АККАУНТ УСПЕШНО ПРИВЯЗАН В 1 КЛИК!</b>\n\n' +
            `👤 <b>Пользователь:</b> ${targetUser.name}\n` +
            `🔑 <b>Логин:</b> <code>@${targetUser.username}</code>\n` +
            `🏷️ <b>Цех:</b> ${targetUser.role} (Уровень ${targetUser.access_level})\n\n` +
            '✅ <b>Внизу экрана активированы кнопки быстрых действий!</b>\n' +
            'Теперь вы можете просматривать задачи, дедлайны и сдавать материалы прямо здесь.'
          );
          await sendTelegramMessage(chatId, reply, kbd);
          return;
        }
      }
      await sendTelegramMessage(chatId, '❌ Пользователь с таким ID не найден на платформе.');
      return;
    }

    // 3. /start, /restart, /menu
    const firstWord = (rawText.trim().split(/\s+/)[0] || '').toLowerCase();
    const isStartCmd = firstWord === '/start' || firstWord.startsWith('/start@');
    const isRestartOrMenu = firstWord === '/restart' || firstWord.startsWith('/restart@') ||
                            firstWord === '/menu' || firstWord.startsWith('/menu@') ||
                            cleanText === 'меню' || cleanText === 'главное меню' || cleanText === 'перезапуск';

    if (isStartCmd || isRestartOrMenu) {
      if (linkedUser && linkedUser.is_approved) {
        const isLead = linkedUser.access_level >= 2;
        const isAdmin = linkedUser.access_level >= 3;
        const kbd = getMainReplyKeyboard(linkedUser);
        const reply = (
          `👋 Здравствуйте, <b>${linkedUser.name}</b>!\n\n` +
          `Ваш Telegram привязан к профилю: <code>@${linkedUser.username}</code> (${linkedUser.role}, Ур. ${linkedUser.access_level}).\n\n` +
          '🔘 <b>Внизу экрана доступны быстрые кнопки действий:</b>\n' +
          '• <b>📋 Мои задачи</b> — список ваших текущих дел\n' +
          '• <b>🔥 Горящие дедлайны</b> — срочные задачи с дедлайнами\n' +
          '• <b>🟢 Свободные задачи</b> — доступная работа в контент-плане\n' +
          (isLead ? '• <b>📋 Задачи на проверке</b> — очередь сдачи с оценками 1–10 и доработкой\n' : '') +
          (isAdmin ? '• <b>👥 Заявки на регистрацию</b> — модерация и одобрение новых участников\n• <b>➕ Добавить участника</b> — ручное добавление человека в команду\n' : '') +
          '• <b>👤 Мой профиль</b> — статус, статистика и рейтинг\n' +
          '• <b>ℹ️ Помощь</b> — команды и руководство\n\n' +
          '<i>Просто кликайте по плашкам внизу экрана!</i>'
        );
        await sendTelegramMessage(chatId, reply, kbd);
      } else {
        const kbd = getMainReplyKeyboard(null);
        const reply = (
          `👋 Привет, <b>${userName}</b>! Я официальный бот медиацентра СГТУ (@ping_sstu_bot).\n\n` +
          '🔹 <b>Если вы уже состоите в команде:</b>\n' +
          'Привяжите свой профиль командой:\n' +
          '<code>/bind &lt;ваш_логин&gt; &lt;ваш_пароль&gt;</code>\n\n' +
          '🔹 <b>Если вы хотите вступить в медиацентр:</b>\n' +
          'Нажмите кнопку внизу экрана или отправьте команду:\n' +
          '<code>/register</code> — <i>подать заявку на регистрацию в цех прямо сейчас!</i>'
        );
        await sendTelegramMessage(chatId, reply, kbd);
      }
      return;
    }

    // 4. /bind <login> <pass>
    if (rawText.startsWith('/bind')) {
      const parts = rawText.split(/\s+/);
      if (parts.length === 3) {
        const login = parts[1].trim().toLowerCase();
        const pwd = parts[2].trim();
        const usr = await db.get('SELECT * FROM users WHERE LOWER(username) = ?', [login]);
        if (usr && db.verifyPassword(pwd, usr.password_hash)) {
          await db.run('UPDATE users SET telegram_id = NULL WHERE telegram_id = ? AND id != ?', [chatId, usr.id]);
          await db.run('UPDATE users SET telegram_id = ? WHERE id = ?', [chatId, usr.id]);
          usr.telegram_id = chatId;
          persistTelegramBinding(chatId, usr);
          telegramAuth.completePendingSessionByTg(chatId, usr);
          const kbd = getMainReplyKeyboard(usr);
          await sendTelegramMessage(
            chatId,
            `✅ <b>Успешно!</b> Профиль <b>${usr.name}</b> (@${usr.username}, ${usr.role}) подключен к боту.\nВнизу активированы кнопки быстрого доступа.`,
            kbd
          );
        } else {
          await sendTelegramMessage(chatId, '❌ Неверный логин или пароль. Попробуйте еще раз.');
        }
      } else {
        await sendTelegramMessage(chatId, 'ℹ️ Формат команды: <code>/bind &lt;ваш_логин&gt; &lt;ваш_пароль&gt;</code>');
      }
      return;
    }

    // 4. Action: 📋 Мои задачи (/tasks, мои задачи)
    const isMyTasks = cleanText.includes('мои задачи') ||
                      cleanText === 'задачи' ||
                      cleanText === '/tasks' ||
                      cleanText === 'tasks' ||
                      cleanText === 'мои дела' ||
                      cleanText === 'список задач';

    if (isMyTasks) {
      if (!linkedUser) {
        await sendTelegramMessage(
          chatId,
          '⚠️ <b>Telegram не привязан к профилю!</b>\n\n' +
          'Чтобы смотреть свои задачи, привяжите аккаунт:\n' +
          '<code>/bind &lt;логин&gt; &lt;пароль&gt;</code>'
        );
        return;
      }

      const tasks = await db.all(
        `SELECT * FROM tasks 
         WHERE assigned_to_id = ? AND status != 'done' 
         ORDER BY 
           CASE WHEN deadline IS NOT NULL AND TRIM(deadline) != '' THEN 0 ELSE 1 END ASC, 
           deadline ASC, 
           id DESC`,
        [linkedUser.id]
      );

      if (!tasks || tasks.length === 0) {
        await sendTelegramMessage(
          chatId,
          `🎉 <b>${linkedUser.name}</b>, у вас нет активных задач!\nВсе назначенные задачи закрыты или вы еще не взяли новую работу в контент-плане.`
        );
        return;
      }

      const now = new Date();
      const lines = [
        `📋 <b>ВАШИ АКТИВНЫЕ ЗАДАЧИ (${tasks.length}):</b>`,
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

        let deadlineInfo = '⏰ <b>Срок:</b> не установлен';
        if (t.deadline) {
          const dDate = new Date(t.deadline);
          const diffHours = (dDate - now) / (1000 * 60 * 60);
          const dateStr = t.deadline.replace('T', ' ');
          if (diffHours < 0) {
            deadlineInfo = `🔥 <b>ПРОСРОЧЕН:</b> <code>${dateStr}</code>`;
          } else if (diffHours <= 48) {
            deadlineInfo = `⚡ <b>ГОРИТ (осталось &lt; ${Math.round(diffHours)} ч):</b> <code>${dateStr}</code>`;
          } else {
            deadlineInfo = `⏰ <b>Дедлайн:</b> <code>${dateStr}</code>`;
          }
        }

        lines.push(`<b>${i + 1}. #${t.id} — ${t.title}</b>`);
        lines.push(`   ${statusIcon} <i>Статус:</i> ${statusName} | 🎯 <i>Цех:</i> <code>${t.direction}</code>`);
        lines.push(`   ${deadlineInfo}`);
        if (t.rework_notes && t.status === 'rework') {
          lines.push(`   ⚠️ <i>Замечания:</i> ${t.rework_notes}`);
        }
        lines.push('');
      });

      lines.push('💡 <i>Чтобы сдать работу, отправьте файл или фото сюда с подписью номера задачи (например: <code>#' + tasks[0].id + '</code>).</i>');
      await sendTelegramMessage(chatId, lines.join('\n'));
      return;
    }

    // 5. Action: 🔥 Горящие дедлайны (/urgent, горящие дедлайны)
    const isUrgent = cleanText.includes('горящие') ||
                     cleanText.includes('дедлайн') ||
                     cleanText === '/urgent' ||
                     cleanText === '/deadlines' ||
                     cleanText === 'deadlines' ||
                     cleanText === 'срочные' ||
                     cleanText.includes('горят');

    if (isUrgent) {
      if (!linkedUser) {
        await sendTelegramMessage(
          chatId,
          '⚠️ <b>Telegram не привязан к профилю!</b>\n\n' +
          'Чтобы смотреть свои дедлайны, привяжите аккаунт:\n' +
          '<code>/bind &lt;логин&gt; &lt;пароль&gt;</code>'
        );
        return;
      }

      const tasks = await db.all(
        `SELECT * FROM tasks 
         WHERE assigned_to_id = ? AND status != 'done' AND deadline IS NOT NULL AND TRIM(deadline) != ''
         ORDER BY deadline ASC`,
        [linkedUser.id]
      );

      const now = new Date();
      const urgentList = tasks.filter(t => {
        const dDate = new Date(t.deadline);
        const diffHours = (dDate - now) / (1000 * 60 * 60);
        return diffHours <= 48; // Overdue or <= 48h
      });

      if (!urgentList || urgentList.length === 0) {
        await sendTelegramMessage(
          chatId,
          `✅ <b>${linkedUser.name}</b>, у вас нет горящих дедлайнов (менее 48 часов)!\nПо всем вашим задачам запас времени достаточный.`
        );
        return;
      }

      const lines = [
        `🔥 <b>ГОРЯЩИЕ ДЕДЛАЙНЫ (${urgentList.length}):</b>`,
        '━━━━━━━━━━━━━━━━━━'
      ];

      urgentList.forEach((t, i) => {
        const dDate = new Date(t.deadline);
        const diffHours = (dDate - now) / (1000 * 60 * 60);
        const dateStr = t.deadline.replace('T', ' ');

        let tag = '⚡ <b>СРОЧНО:</b>';
        if (diffHours < 0) tag = '🔥 <b>ПРОСРОЧЕН:</b>';
        else if (diffHours <= 24) tag = '⚡ <b>ГОРИТ СЕГОДНЯ:</b>';

        lines.push(`<b>${i + 1}. #${t.id} — ${t.title}</b>`);
        lines.push(`   ${tag} <code>${dateStr}</code>`);
        lines.push(`   <i>Статус:</i> ${t.status === 'rework' ? 'На доработке' : 'В работе'} | 🎯 <i>Цех:</i> <code>${t.direction}</code>`);
        lines.push('');
      });

      lines.push('⚡ <i>Постарайтесь завершить и сдать работу до истечения срока!</i>');
      await sendTelegramMessage(chatId, lines.join('\n'));
      return;
    }

    // 5.1. Action: 🟢 Свободные задачи (/open, свободные)
    const isOpenTasks = cleanText.includes('свободные') ||
                        cleanText.includes('открытые') ||
                        cleanText === '/open' ||
                        cleanText === 'open' ||
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
        await sendTelegramMessage(
          chatId,
          '🎉 <b>В контент-плане сейчас нет свободных задач!</b>\nВсе задачи распределены по участникам или уже завершены.'
        );
        return;
      }

      const now = new Date();
      const lines = [
        `🟢 <b>СВОБОДНЫЕ ЗАДАЧИ В КОНТЕНТ-ПЛАНЕ (${openTasks.length}):</b>`,
        '━━━━━━━━━━━━━━━━━━'
      ];

      openTasks.forEach((t, i) => {
        let deadlineInfo = '⏰ <b>Срок:</b> не установлен';
        if (t.deadline) {
          const dDate = new Date(t.deadline);
          const diffHours = (dDate - now) / (1000 * 60 * 60);
          const dateStr = t.deadline.replace('T', ' ');
          if (diffHours < 0) {
            deadlineInfo = `🔥 <b>ПРОСРОЧЕН:</b> <code>${dateStr}</code>`;
          } else if (diffHours <= 48) {
            deadlineInfo = `⚡ <b>ГОРИТ (&lt; ${Math.round(diffHours)} ч):</b> <code>${dateStr}</code>`;
          } else {
            deadlineInfo = `⏰ <b>Дедлайн:</b> <code>${dateStr}</code>`;
          }
        }

        const isMyDir = (linkedUser && linkedUser.role === t.direction) ? ' ⭐ (Ваш цех!)' : '';
        lines.push(`<b>${i + 1}. #${t.id} — ${t.title}</b>${isMyDir}`);
        lines.push(`   🎯 <i>Цех:</i> <code>${t.direction}</code> | ${deadlineInfo}`);
        if (t.description) {
          const descPreview = t.description.length > 70 ? t.description.substring(0, 67) + '...' : t.description;
          lines.push(`   📝 <i>ТЗ:</i> ${descPreview}`);
        }
        lines.push('');
      });

      lines.push('🌐 <i>Взять задачу в работу можно на платформе:</i> <a href="http://localhost:8000/content-plan">Открыть Контент-план</a>');
      await sendTelegramMessage(chatId, lines.join('\n'));
      return;
    }

    // 6. Action: 👤 Мой профиль (/profile, /me, мой профиль)
    const isProfile = cleanText.includes('профиль') ||
                      cleanText === '/profile' ||
                      cleanText === '/me' ||
                      cleanText === 'мой аккаунт' ||
                      cleanText === 'аккаунт';

    if (isProfile) {
      if (!linkedUser) {
        const guestKbd = {
          inline_keyboard: [
            [
              { text: '🆔 Узнать Chat ID', callback_data: 'cmd:myid' }
            ]
          ]
        };
        await sendTelegramMessage(
          chatId,
          '👤 <b>ВАШ TELEGRAM НЕ ПРИВЯЗАН К ПЛАТФОРМЕ</b>\n\n' +
          `🆔 Ваш Chat ID: <code>${chatId}</code>\n\n` +
          'Чтобы привязать аккаунт:\n' +
          '1. Откройте профиль на сайте и нажмите «Подключить Telegram»\n' +
          '2. Или напишите команду прямо сюда:\n' +
          '<code>/bind &lt;ваш_логин&gt; &lt;пароль&gt;</code>',
          guestKbd
        );
        return;
      }

      const roleLabels = { 1: 'Участник', 2: 'Глава цеха', 3: 'Руководитель', 4: 'Главный Администратор' };
      const levelTitle = roleLabels[linkedUser.access_level] || `Уровень ${linkedUser.access_level}`;
      const avgScore = (linkedUser.average_score || 0).toFixed(1);

      const profileCard = (
        '👤 <b>ВАШ ПРОФИЛЬ В МЕДИАЦЕНТРЕ СГТУ:</b>\n\n' +
        `👤 <b>ФИО:</b> ${linkedUser.name}\n` +
        `🔑 <b>Логин:</b> <code>@${linkedUser.username}</code>\n` +
        `🏷️ <b>Цех:</b> <b>${linkedUser.role}</b>\n` +
        `👑 <b>Должность:</b> ${levelTitle} (Ур. ${linkedUser.access_level})\n` +
        `⭐ <b>Средний балл:</b> <b>${avgScore} / 10.0</b>\n` +
        `✅ <b>Сдано и закрыто задач:</b> <b>${linkedUser.completed_tasks || 0}</b>\n` +
        `🆔 <b>Telegram Chat ID:</b> <code>${chatId}</code>\n\n` +
        `🌐 <a href="http://localhost:8000/profile/${linkedUser.id}">Открыть профиль на сайте</a>`
      );
      const profileKbd = {
        inline_keyboard: [
          [
            { text: '🆔 Узнать Chat ID', callback_data: 'cmd:myid' },
            { text: '🚪 Отвязать Telegram', callback_data: 'cmd:ask_unbind' }
          ]
        ]
      };
      await sendTelegramMessage(chatId, profileCard, profileKbd);
      return;
    }

    // 7. Action: 📋 Задачи на проверке (/review, задачи на проверке)
    const isReview = cleanText.includes('на проверке') ||
                     cleanText.includes('проверка') ||
                     cleanText === '/review' ||
                     cleanText === 'очередь';

    if (isReview) {
      if (!linkedUser) {
        await sendTelegramMessage(
          chatId,
          '⚠️ <b>Ваш Telegram пока не привязан к профилю руководителя.</b>\n\n' +
          'Чтобы проверять и оценивать задачи:\n' +
          '<code>/bind &lt;ваш_логин&gt; &lt;ваш_пароль&gt;</code>'
        );
        return;
      }

      if (linkedUser.access_level < 2) {
        await sendTelegramMessage(
          chatId,
          `🔒 Доступ к очереди проверки разрешен главам цехов (2+) и руководству (3–4).\nВаш текущий профиль: ${linkedUser.name} (${linkedUser.role}, Ур. ${linkedUser.access_level}).`
        );
        return;
      }

      let reviewTasks;
      if (linkedUser.access_level >= 3) {
        reviewTasks = await db.all('SELECT * FROM tasks WHERE status = "review" ORDER BY id DESC');
      } else {
        reviewTasks = await db.all('SELECT * FROM tasks WHERE status = "review" AND direction = ? ORDER BY id DESC', [linkedUser.role]);
      }

      if (reviewTasks.length > 0) {
        const gdriveFolderUrl = gdriveService.getTargetFolderUrl();
        const header = (
          `📋 <b>В очереди на проверку: ${reviewTasks.length} задач(и).</b>\n` +
          (linkedUser.access_level === 2 ? `📂 <i>Цех: ${linkedUser.role}</i>\n` : '') +
          `\n📁 <b>Google Диск команды:</b> <a href="${gdriveFolderUrl}">Открыть папку сдачи</a>\n` +
          'Выберите оценку от 1 до 10 для нужного задания кнопками ниже:'
        );
        await sendTelegramMessage(chatId, header);

        for (const t of reviewTasks.slice(0, 10)) {
          let assigneeName = 'Не назначен';
          if (t.assigned_to_id) {
            const assignee = await db.get('SELECT name FROM users WHERE id = ?', [t.assigned_to_id]);
            if (assignee) assigneeName = assignee.name;
          }

          const fileBadge = t.file_name ? `📎 <b>Сданный файл:</b> <code>${t.file_name}</code>\n` : '';
          const deadlineBadge = t.deadline ? `⏰ <b>Дедлайн:</b> <code>${t.deadline.replace('T', ' ')}</code>\n` : '';
          const fileInfoLine = t.file_link ? `🔗 <b>Ссылка / файл:</b> ${t.file_link}\n` : '';
          const descLine = t.description ? `📝 <b>ТЗ:</b> ${t.description.length > 100 ? t.description.slice(0, 97) + '...' : t.description}\n` : '';

          const card = (
            `📌 <b>Задача #${t.id}</b> — <b>${t.title}</b>\n` +
            `📂 <b>Цех:</b> <code>${t.direction}</code> | 👤 <b>Исполнитель:</b> ${assigneeName}\n` +
            descLine +
            deadlineBadge +
            fileBadge +
            fileInfoLine + '\n' +
            '⭐ <b>Поставьте оценку прямо здесь (1–10) или отправьте на доработку:</b>'
          );
          const kbd = getRatingKeyboard(t.id, t.file_link);
          await sendTelegramMessage(chatId, card, kbd);
        }
      } else {
        await sendTelegramMessage(chatId, '🎉 <b>Очередь проверки пуста!</b>\nВсе сданные задачи уже проверены и закрыты.');
      }
      return;
    }

    // 7.1. Command: /grade <taskId> <score> or /rate <taskId> <score>
    if (rawText.startsWith('/grade') || rawText.startsWith('/rate')) {
      const parts = rawText.split(/\s+/);
      if (parts.length >= 3) {
        const taskId = parseInt(parts[1], 10);
        const score = parseInt(parts[2], 10);
        if (!isNaN(taskId) && !isNaN(score)) {
          const res = await applyTaskRatingByTgUser(taskId, score, tgUserId, tgUsername);
          await sendTelegramMessage(chatId, res.message);
          return;
        }
      }
      await sendTelegramMessage(chatId, 'ℹ️ Формат команды: <code>/grade &lt;ID задачи&gt; &lt;оценка 1-10&gt;</code>\nПример: <code>/grade 5 10</code>');
      return;
    }

    // 7.2. Command: /rework <taskId> [notes]
    if (rawText.startsWith('/rework')) {
      const parts = rawText.split(/\s+/);
      if (parts.length >= 2) {
        const taskId = parseInt(parts[1], 10);
        const notes = parts.slice(2).join(' ') || 'Возвращено на доработку через Telegram';
        if (!isNaN(taskId)) {
          const res = await applyTaskReworkByTgUser(taskId, tgUserId, tgUsername, notes);
          await sendTelegramMessage(chatId, res.message);
          return;
        }
      }
      await sendTelegramMessage(chatId, 'ℹ️ Формат команды: <code>/rework &lt;ID задачи&gt; &lt;замечания&gt;</code>\nПример: <code>/rework 5 Переделать первый слайд</code>');
      return;
    }

    // 7.3. Action: 👥 Заявки на регистрацию (/pending, /requests, заявки)
    const isPending = cleanText.includes('заявки') ||
                      cleanText.includes('модераци') ||
                      cleanText === '/pending' ||
                      cleanText === '/requests';

    if (isPending) {
      if (!linkedUser) {
        await sendTelegramMessage(chatId, '⚠️ Сначала привяжите аккаунт руководителя: <code>/bind &lt;логин&gt; &lt;пароль&gt;</code>');
        return;
      }
      if (linkedUser.access_level < 3) {
        await sendTelegramMessage(chatId, `🔒 Управление заявками доступно руководству и администраторам (3–4 ур.). Ваш профиль: ${linkedUser.name} (Ур. ${linkedUser.access_level}).`);
        return;
      }

      const pendingUsers = await db.all('SELECT * FROM users WHERE is_approved = 0 ORDER BY id DESC');
      if (pendingUsers.length === 0) {
        await sendTelegramMessage(chatId, '🎉 <b>Нет заявок на модерации!</b>\nВсе кандидаты уже одобрены и имеют доступ.');
        return;
      }

      await sendTelegramMessage(chatId, `👥 <b>На рассмотрении ${pendingUsers.length} заявок(ки):</b>`);

      for (const cand of pendingUsers) {
        const tgStr = cand.telegram_id ? (cand.telegram_id.startsWith('@') ? cand.telegram_id : `ID: <code>${cand.telegram_id}</code>`) : 'не указан';
        const candCard = (
          `👤 <b>Заявка #${cand.id}: ${cand.name}</b>\n` +
          `🔑 <b>Логин:</b> <code>@${cand.username}</code>\n` +
          `🏷️ <b>Желаемый цех:</b> <b>${cand.role}</b>\n` +
          `✈️ <b>Telegram:</b> ${tgStr}\n\n` +
          'Нажмите кнопку для решения прямо из Telegram:'
        );
        const kbd = {
          inline_keyboard: [
            [
              { text: '✅ Одобрить (Участник)', callback_data: `approve_user:${cand.id}:1` },
              { text: '👑 Одобрить (Глава цеха)', callback_data: `approve_user:${cand.id}:2` }
            ],
            [
              { text: '❌ Отклонить', callback_data: `reject_user:${cand.id}` }
            ]
          ]
        };
        await sendTelegramMessage(chatId, candCard, kbd);
      }
      return;
    }

    // 7.4. Action: ➕ Добавить участника (/add_user, /add, добавить участника)
    const isAddUserBtn = cleanText.includes('добавить участника') || cleanText === 'добавить';
    if (rawText.startsWith('/add_user') || rawText.startsWith('/add') || isAddUserBtn) {
      if (!linkedUser) {
        await sendTelegramMessage(chatId, '⚠️ Сначала привяжите профиль руководителя: <code>/bind &lt;логин&gt; &lt;пароль&gt;</code>');
        return;
      }
      if (linkedUser.access_level < 3) {
        await sendTelegramMessage(chatId, '🔒 Добавлять участников могут только руководители (3+) и администраторы (4 ур.).');
        return;
      }

      const parts = rawText.split(/\s+/);
      if (parts.length >= 4 && (parts[0] === '/add_user' || parts[0] === '/add')) {
        const newLogin = parts[1].replace('@', '').toLowerCase().trim();
        const rawRole = parts[2].trim();
        const newName = parts.slice(3).join(' ').trim();

        const validRoles = ['Фото', 'Дизайн', 'Видео', 'Моушен', 'СММ', 'Руководство'];
        const matchedRole = validRoles.find(r => r.toLowerCase() === rawRole.toLowerCase()) || rawRole;

        const existing = await db.get('SELECT id FROM users WHERE LOWER(username) = ?', [newLogin]);
        if (existing) {
          await sendTelegramMessage(chatId, `❌ Логин <code>@${newLogin}</code> уже занят другим участником.`);
          return;
        }

        const passHash = db.hashPassword('kedr2026');
        const insRes = await db.run(
          `INSERT INTO users (name, username, password_hash, role, access_level, is_approved, completed_tasks, average_score)
           VALUES (?, ?, ?, ?, 1, 1, 0, 0.0)`,
          [newName, newLogin, passHash, matchedRole]
        );
        const createdId = insRes.lastID;
        const botName = getBotUsername();

        const successCard = (
          '✅ <b>УЧАСТНИК УСПЕШНО ДОБАВЛЕН!</b>\n\n' +
          `👤 <b>ФИО:</b> ${newName}\n` +
          `🔑 <b>Логин:</b> <code>@${newLogin}</code>\n` +
          `🏷️ <b>Цех:</b> <b>${matchedRole}</b>\n` +
          '🔑 <b>Пароль по умолчанию:</b> <code>kedr2026</code>\n' +
          '⭐ <b>Уровень доступа:</b> 1 (Участник)\n\n' +
          '🔗 <b>Ссылка для привязки в 1 клик в Telegram:</b>\n' +
          `https://t.me/${botName}?start=bind_${createdId}\n\n` +
          '<i>Перешлите эту ссылку участнику — он нажмет «Запустить» в Telegram и сразу подключится к боту!</i>'
        );
        await sendTelegramMessage(chatId, successCard);
        return;
      }

      const helpMsg = (
        '➕ <b>ДОБАВЛЕНИЕ УЧАСТНИКА В КОМАНДУ</b>\n\n' +
        'Чтобы добавить человека, отправьте команду:\n' +
        '<code>/add_user &lt;логин&gt; &lt;цех&gt; &lt;Имя и Фамилия&gt;</code>\n\n' +
        '📌 <b>Пример:</b>\n' +
        '<code>/add_user ivanov Фото Иван Иванов</code>\n\n' +
        '🏷️ <b>Доступные цехи:</b> <code>Фото</code>, <code>Дизайн</code>, <code>Видео</code>, <code>Моушен</code>, <code>СММ</code>, <code>Руководство</code>.\n\n' +
        '💡 <i>Пароль по умолчанию создается:</i> <code>kedr2026</code>\n' +
        '<i>Бот автоматически создаст пользователя и пришлет персональную ссылку для входа!</i>'
      );
      await sendTelegramMessage(chatId, helpMsg);
      return;
    }

    // 7.5. Action: 📝 Регистрация / подать заявку (/register, регистрация, подать заявку)
    const isRegister = cleanText.includes('подать заявку') ||
                       cleanText.includes('регистраци') ||
                       cleanText === '/register';

    if (isRegister) {
      if (linkedUser && linkedUser.is_approved) {
        await sendTelegramMessage(
          chatId,
          `✅ Вы уже зарегистрированы и активны в медиацентре: <b>${linkedUser.name}</b> (${linkedUser.role}, Ур. ${linkedUser.access_level}).`,
          getMainReplyKeyboard(linkedUser)
        );
        return;
      }

      const pendingCheck = await db.get('SELECT * FROM users WHERE telegram_id = ? AND is_approved = 0', [chatId]);
      if (pendingCheck) {
        await sendTelegramMessage(
          chatId,
          `⏳ Ваша заявка (<b>${pendingCheck.name}</b>, цех: <b>${pendingCheck.role}</b>) уже находится на рассмотрении руководства медиацентра.\n\nКак только администратор подтвердит её, вы получите уведомление!`
        );
        return;
      }

      const regKbd = {
        inline_keyboard: [
          [
            { text: '📸 Фото', callback_data: 'reg_dept:Фото' },
            { text: '🎨 Дизайн', callback_data: 'reg_dept:Дизайн' }
          ],
          [
            { text: '🎬 Видео', callback_data: 'reg_dept:Видео' },
            { text: '✨ Моушен', callback_data: 'reg_dept:Моушен' }
          ],
          [
            { text: '📱 СММ', callback_data: 'reg_dept:СММ' }
          ]
        ]
      };

      const msgText = (
        '📝 <b>РЕГИСТРАЦИЯ В МЕДИАЦЕНТР СМС СГТУ</b>\n\n' +
        `Приветствуем, <b>${userName}</b>!\n` +
        'Выберите цех (направление), в котором вы хотите работать:\n\n' +
        '• <b>Фото</b> — репортажная и студийная съемка\n' +
        '• <b>Дизайн</b> — графика, баннеры, айдентика\n' +
        '• <b>Видео</b> — съемка и монтаж сюжетов\n' +
        '• <b>Моушен</b> — анимация, титры, заставки\n' +
        '• <b>СММ</b> — копирайтинг, посты, контент-план\n\n' +
        '<i>Нажмите на кнопку с нужным направлением ниже:</i>'
      );
      await sendTelegramMessage(chatId, msgText, regKbd);
      return;
    }

    // 8. Action: 📊 Статистика медиацентра (/stats, статистика)
    const isStats = cleanText.includes('статистика') ||
                    cleanText === '/stats' ||
                    cleanText === 'сводка';

    if (isStats) {
      const totalUsers = (await db.get('SELECT COUNT(*) as c FROM users WHERE is_approved = 1')).c;
      const doneCount = (await db.get('SELECT COUNT(*) as c FROM tasks WHERE status = "done"')).c;
      const reviewCount = (await db.get('SELECT COUNT(*) as c FROM tasks WHERE status = "review"')).c;
      const inProgCount = (await db.get('SELECT COUNT(*) as c FROM tasks WHERE status = "in_progress"')).c;

      const msgStats = (
        '📊 <b>СТАТИСТИКА МЕДИАЦЕНТРА СГТУ</b>\n\n' +
        `👥 Участников команды: <b>${totalUsers}</b>\n` +
        `✅ Закрыто задач: <b>${doneCount}</b>\n` +
        `⏳ В работе сейчас: <b>${inProgCount}</b>\n` +
        `🔍 Ожидают проверки: <b>${reviewCount}</b>\n\n` +
        '🌐 Платформа: <a href="http://localhost:8000">http://localhost:8000</a>'
      );
      await sendTelegramMessage(chatId, msgStats);
      return;
    }

    // 9. Action: ℹ️ Помощь (/help, помощь, справка)
    const isHelp = cleanText.includes('помощь') ||
                   cleanText.includes('справка') ||
                   cleanText === '/help' ||
                   cleanText === 'help';

    if (isHelp) {
      const isLead = linkedUser && linkedUser.access_level >= 2;
      const isAdmin = linkedUser && linkedUser.access_level >= 3;
      const helpText = (
        'ℹ️ <b>СПРАВКА ПО БОТУ МЕДИАЦЕНТРА (@ping_sstu_bot):</b>\n\n' +
        '🔘 <b>Кнопки на клавиатуре (внизу экрана):</b>\n' +
        '• <b>📋 Мои задачи</b> — список ваших задач в работе и на доработке\n' +
        '• <b>🔥 Горящие дедлайны</b> — задачи со сроком менее 48ч или просроченные\n' +
        '• <b>🟢 Свободные задачи</b> — просмотр открытых задач в контент-плане\n' +
        (isLead ? '• <b>📋 Задачи на проверке</b> — очередь работ с кнопками быстрой оценки (1–10) и доработкой\n' : '') +
        (isAdmin ? '• <b>👥 Заявки на регистрацию</b> — модерация и одобрение новых участников\n• <b>➕ Добавить участника</b> — ручное добавление новичка в цех\n• <b>👑 Зарегистрировать чат</b> — привязать этот чат как чат руководства для уведомлений и оценок\n' : '') +
        '• <b>👤 Мой профиль</b> — ваши данные, цех, уровень и рейтинг\n' +
        '• <b>📊 Статистика медиацентра</b> — общая сводка команды\n' +
        '• <b>🆔 Мой Chat ID</b> — ваш цифровой Chat ID для привязки и уведомлений\n' +
        '• <b>🚪 Отвязать аккаунт</b> — отвязать Telegram от профиля\n' +
        (!linkedUser ? '• <b>🔑 Привязать аккаунт</b> — инструкция по подключению Telegram\n• <b>📝 Подать заявку на регистрацию</b> — анкета в команду медиацентра\n' : '') +
        '• <b>ℹ️ Помощь</b> — эта справка\n\n' +
        '📤 <b>Сдача работ:</b>\n' +
        'Просто отправьте боту файл, фото или видео с указанием номера задачи в подписи (например: <code>#12</code>).\n\n' +
        '⌨️ <b>Команды и меню [ Меню ]:</b>\n' +
        '• <code>/start</code> — перезапустить клавиатуру и меню\n' +
        '• <code>/register</code> — подать заявку на вступление в медиацентр\n' +
        '• <code>/bind &lt;логин&gt; &lt;пароль&gt;</code> — связать аккаунт\n' +
        '• <code>/unbind</code> — отвязать Telegram от профиля\n' +
        '• <code>/myid</code> — показать ваш цифровой Chat ID\n' +
        '• <code>/review</code> — открыть очередь проверки задач\n' +
        '• <code>/rate &lt;ID&gt; &lt;оценка 1-10&gt;</code> — выставить оценку задаче\n' +
        '• <code>/rework &lt;ID&gt; [замечания]</code> — вернуть на доработку\n' +
        (isAdmin ? '• <code>/candidates</code> (/pending) — заявки на регистрацию\n• <code>/add_user &lt;логин&gt; &lt;цех&gt; &lt;ФИО&gt;</code> — добавить участника\n• <code>/setchat</code> — зарегистрировать чат руководства\n' : '') +
        '• <code>/help</code> — показать эту справку'
      );
      await sendTelegramMessage(chatId, helpText);
      return;
    }

    // 10. /rate <task_id> <score>
    if (rawText.startsWith('/rate') || rawText.startsWith('/grade') || rawText.startsWith('/оценить')) {
      const parts = rawText.split(/\s+/);
      if (parts.length === 3 && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const tid = parseInt(parts[1], 10);
        const sc = parseInt(parts[2], 10);
        const res = await applyTaskRatingByTgUser(tid, sc, tgUserId, tgUsername);
        await sendTelegramMessage(chatId, res.message);
      } else {
        await sendTelegramMessage(chatId, 'ℹ️ Формат команды: <code>/rate &lt;ID_задачи&gt; &lt;оценка_от_1_до_10&gt;</code> (напр. <code>/rate 5 10</code>)');
      }
      return;
    }

    // 11. /rework <task_id> [notes]
    if (rawText.startsWith('/rework') || rawText.startsWith('/доработка')) {
      const parts = rawText.split(/\s+/);
      if (parts.length >= 2 && !isNaN(parts[1])) {
        const tid = parseInt(parts[1], 10);
        const notes = parts.slice(2).join(' ').trim() || 'Возвращено на доработку руководителем';
        const res = await applyTaskReworkByTgUser(tid, tgUserId, tgUsername, notes);
        await sendTelegramMessage(chatId, res.message);
      } else {
        await sendTelegramMessage(chatId, 'ℹ️ Формат команды: <code>/rework &lt;ID_задачи&gt; [замечания]</code>');
      }
      return;
    }

    // 12. /setchat, 👑 Зарегистрировать чат
    const isSetChat = rawText.startsWith('/setchat') ||
                      rawText.startsWith('/register_chat') ||
                      cleanText.includes('зарегистрировать чат') ||
                      cleanText.includes('чат руководства');

    if (isSetChat) {
      if (!linkedUser) {
        await sendTelegramMessage(chatId, '⚠️ Сначала привяжите аккаунт руководителя: <code>/bind &lt;логин&gt; &lt;пароль&gt;</code>');
        return;
      }
      if (linkedUser.access_level < 3) {
        await sendTelegramMessage(chatId, `🔒 Настройка чата руководства доступна только руководителям и администраторам (3–4 ур.). Ваш профиль: ${linkedUser.name} (Ур. ${linkedUser.access_level}).`);
        return;
      }
      saveConfig({ leadership_group_chat_id: chatId });
      await sendTelegramMessage(
        chatId,
        '👑 <b>ЧАТ РУКОВОДСТВА УСПЕШНО ЗАРЕГИСТРИРОВАН!</b>\n\n' +
        `ID чата: <code>${chatId}</code> сохранен в системе.\nСюда будут направляться все сданные задачи с интерактивными кнопками для выставления оценок и заявки новых кандидатов.`
      );
      return;
    }

    // 13. /myid, 🆔 Мой Chat ID
    const isMyId = rawText === '/myid' ||
                   rawText.startsWith('/myid@') ||
                   cleanText.includes('мой chat id') ||
                   cleanText.includes('мой id') ||
                   cleanText === 'chat id' ||
                   cleanText === 'id';

    if (isMyId) {
      const tgUsernameStr = tgUsername ? ` (@${tgUsername})` : '';
      const nameStr = linkedUser ? `\n👤 <b>Привязанный профиль:</b> ${linkedUser.name} (Цех: ${linkedUser.role}, Ур. ${linkedUser.access_level})` : '\n⚠️ <i>Профиль на сайте пока не привязан.</i>';
      await sendTelegramMessage(
        chatId,
        '🆔 <b>ВАШИ ИДЕНТИФИКАТОРЫ В TELEGRAM:</b>\n\n' +
        `• <b>Chat ID:</b> <code>${chatId}</code>\n` +
        `• <b>User ID:</b> <code>${tgUserId}</code>${tgUsernameStr}${nameStr}\n\n` +
        '💡 <i>Этот ID используется для отправки персональных уведомлений и подтверждения прав доступа.</i>'
      );
      return;
    }

    // 14. /unbind, 🚪 Отвязать аккаунт
    const isUnbind = rawText === '/unbind' ||
                     rawText.startsWith('/unbind@') ||
                     cleanText.includes('отвязать аккаунт') ||
                     cleanText === 'отвязать' ||
                     cleanText === 'выйти';

    if (isUnbind) {
      const usr = await findLinkedTelegramUser(chatId, tgUserId, tgUsername);
      if (usr) {
        await db.run('UPDATE users SET telegram_id = NULL WHERE id = ?', [usr.id]);
        removeTelegramBinding(chatId);
        removeTelegramBinding(usr.id);
        await sendTelegramMessage(
          chatId,
          `✅ Аккаунт <b>${usr.name}</b> успешно отвязан от Telegram. Оповещения о задачах отключены.`,
          getMainReplyKeyboard(null)
        );
      } else {
        await sendTelegramMessage(
          chatId,
          'ℹ️ Ваш Telegram не привязан ни к одному аккаунту.',
          getMainReplyKeyboard(null)
        );
      }
      return;
    }

    // 15. 🔑 Привязать аккаунт
    const isBindClick = cleanText.includes('привязать аккаунт') ||
                        cleanText === 'привязать' ||
                        cleanText === 'войти' ||
                        cleanText === 'вход';

    if (isBindClick) {
      if (linkedUser) {
        await sendTelegramMessage(
          chatId,
          `✅ Ваш Telegram уже привязан к профилю: <b>${linkedUser.name}</b> (${linkedUser.role}, Ур. ${linkedUser.access_level}).`,
          getMainReplyKeyboard(linkedUser)
        );
        return;
      }
      const bindHelp = (
        '🔑 <b>ПРИВЯЗКА TELEGRAM К ПРОФИЛЮ МЕДИАЦЕНТРА</b>\n\n' +
        '🔹 <b>Способ 1 — прямо в этом чате:</b>\n' +
        'Отправьте команду:\n' +
        '<code>/bind &lt;ваш_логин&gt; &lt;ваш_пароль&gt;</code>\n' +
        '<i>(Например: <code>/bind stepyn 123456</code>)</i>\n\n' +
        '🔹 <b>Способ 2 — через сайт:</b>\n' +
        'Войдите в личный кабинет на сайте и в профиле нажмите кнопку <b>«Подключить Telegram»</b>.'
      );
      await sendTelegramMessage(chatId, bindHelp);
      return;
    }

    // Default response for private chats
    if (!chatId.startsWith('-')) {
      await sendTelegramMessage(
        chatId,
        '💡 Используйте кнопки действий внизу экрана для быстрого просмотра задач и дедлайнов, либо отправьте <code>/help</code> для справки.'
      );
    }
  }

  async handleFileSubmission(message, chatId, tgUserId, tgUsername, userName) {
    let linkedUser = await findLinkedTelegramUser(chatId, tgUserId, tgUsername);

    if (!linkedUser) {
      const msg = (
        '⚠️ <b>Telegram не привязан к аккаунту!</b>\n\n' +
        'Чтобы сдавать файлы через бота, привяжите свой профиль:\n' +
        '1. Нажмите «Подключить Telegram» в вашем профиле на сайте\n' +
        '2. Или отправьте команду: <code>/bind &lt;ваш_логин&gt; &lt;пароль&gt;</code>'
      );
      await sendTelegramMessage(chatId, msg);
      return;
    }

    const caption = (message.caption || '').trim();
    let targetTask = null;

    if (caption) {
      const match = caption.match(/#?(\d+)/);
      if (match) {
        const candId = parseInt(match[1], 10);
        const candTask = await db.get('SELECT * FROM tasks WHERE id = ?', [candId]);
        if (candTask && (candTask.assigned_to_id === linkedUser.id || linkedUser.access_level >= 4)) {
          targetTask = candTask;
        }
      }
    }

    if (!targetTask) {
      const userProgressTasks = await db.all(
        'SELECT * FROM tasks WHERE assigned_to_id = ? AND status IN ("in_progress", "rework") ORDER BY id DESC',
        [linkedUser.id]
      );

      if (userProgressTasks.length === 1) {
        targetTask = userProgressTasks[0];
      } else if (userProgressTasks.length > 1) {
        const statusLabels = { in_progress: 'в работе', rework: 'на доработке' };
        const taskList = userProgressTasks.map(t => `• <code>#${t.id}</code> — <b>${t.title}</b> (${t.direction}, статус: ${statusLabels[t.status] || t.status})`).join('\n');
        const msg = (
          '📌 <b>У вас несколько активных задач (в работе / на доработке):</b>\n\n' +
          `${taskList}\n\n` +
          `Пожалуйста, отправьте файл повторно, указав в подписи номер задачи (например: <code>#${userProgressTasks[0].id}</code>).`
        );
        await sendTelegramMessage(chatId, msg);
        return;
      } else {
        const msg = (
          'ℹ️ <b>У вас нет активных задач в работе или на доработке.</b>\n\n' +
          'Сначала возьмите задачу в Контент-плане на сайте, либо укажите номер задачи в подписи к файлу.'
        );
        await sendTelegramMessage(chatId, msg);
        return;
      }
    }

    // Extract file from message
    const token = getBotToken();
    let fileId = null;
    let origName = 'file.bin';

    if (message.document) {
      fileId = message.document.file_id;
      origName = message.document.file_name || `doc_${targetTask.id}.bin`;
    } else if (message.photo && message.photo.length > 0) {
      fileId = message.photo[message.photo.length - 1].file_id;
      origName = `photo_task_${targetTask.id}.jpg`;
    } else if (message.video) {
      fileId = message.video.file_id;
      origName = message.video.file_name || `video_${targetTask.id}.mp4`;
    }

    if (!fileId) {
      await sendTelegramMessage(chatId, '❌ Не удалось извлечь файл из сообщения.');
      return;
    }

    const cfg = getConfig();
    const baseUrl = (cfg.api_base_url || 'https://api.telegram.org').trim().replace(/\/+$/, '');
    const fileInfoRes = await callTelegramApi('getFile', { file_id: fileId });
    if (!fileInfoRes || !fileInfoRes.ok || !fileInfoRes.result) {
      await sendTelegramMessage(chatId, '❌ Не удалось получить ссылку на файл от Telegram.');
      return;
    }

    const filePath = fileInfoRes.result.file_path;
    const downloadUrl = `${baseUrl}/file/bot${token}/${filePath}`;
    const fetchOpts = { signal: AbortSignal.timeout(60000) };
    const dispatcher = getProxyDispatcher();
    if (dispatcher) fetchOpts.dispatcher = dispatcher;
    const fileResp = await fetch(downloadUrl, fetchOpts);
    const arrayBuffer = await fileResp.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const { fileLink, fileName: cleanName, gdriveRes } = await gdriveService.saveLocalAndSyncGdrive(
      fileBuffer,
      origName,
      targetTask.id
    );

    await db.run(
      'UPDATE tasks SET file_link = ?, file_name = ?, status = "review" WHERE id = ?',
      [fileLink, cleanName, targetTask.id]
    );
    targetTask.file_link = fileLink;
    targetTask.file_name = cleanName;
    targetTask.status = 'review';

    await notifyTaskSubmittedForReview(targetTask, linkedUser);

    const gdriveFolderUrl = gdriveService.getTargetFolderUrl();
    const gdriveNote = (gdriveRes && gdriveRes.web_link)
      ? `\n📁 Файл также синхронизирован в <a href="${gdriveFolderUrl}">Google Диск команды</a>`
      : `\n📁 Файл сохранен и доступен в <a href="${gdriveFolderUrl}">папке Google Диска</a>`;

    const confirmation = (
      '🎉 <b>ФАЙЛ УСПЕШНО ПРИНЯТ И ОТПРАВЛЕН!</b>\n\n' +
      `📌 <b>Задача:</b> <code>#${targetTask.id}</code> — <b>${targetTask.title}</b>\n` +
      `📎 <b>Файл:</b> <code>${cleanName}</code>\n` +
      '🔍 <b>Статус:</b> <code>На проверке у руководства (review)</code>\n' +
      `${gdriveNote}\n\n` +
      '⚡ Руководители получили уведомление и кнопки для проверки и выставления оценки.'
    );
    await sendTelegramMessage(chatId, confirmation);
  }
}

const botWorker = new TelegramBotWorker();

async function registerBotCommands() {
  const commands = [
    { command: 'start', description: '🏠 Главное меню и клавиатура' },
    { command: 'tasks', description: '📌 Мои текущие задачи' },
    { command: 'deadlines', description: '🔥 Горящие дедлайны' },
    { command: 'open', description: '🟢 Свободные задачи контент-плана' },
    { command: 'profile', description: '👤 Мой профиль и статистика' },
    { command: 'stats', description: '📊 Общая статистика медиацентра' },
    { command: 'review', description: '📋 Задачи на проверке (Руководство)' },
    { command: 'candidates', description: '👥 Заявки кандидатов (Руководство)' },
    { command: 'myid', description: '🆔 Мой Telegram Chat ID' },
    { command: 'bind', description: '🔑 Привязать аккаунт платформы' },
    { command: 'unbind', description: '🚪 Отвязать аккаунт от Telegram' },
    { command: 'setchat', description: '👑 Назначить этот чат чатом руководства' },
    { command: 'help', description: '❓ Справка по возможностям бота' }
  ];
  try {
    const res = await callTelegramApi('setMyCommands', { commands });
    if (res && res.ok) {
      console.log('[TelegramBot] ✅ Bot commands registered successfully in native menu.');
    } else {
      console.warn('[TelegramBot] ⚠️ setMyCommands response:', res);
    }
  } catch (err) {
    console.error('[TelegramBot] ❌ Failed to register bot commands:', err.message);
  }
}

async function initTelegramBot() {
  await syncTelegramBindings();
  botWorker.start();
  registerBotCommands().catch(err => console.error('[TelegramBot] registerBotCommands error:', err.message));
}

module.exports = {
  getConfig,
  saveConfig,
  getBotToken,
  getBotUsername,
  getLeadershipChatId,
  getMainReplyKeyboard,
  sendTelegramMessage,
  editTelegramMessage,
  answerCallbackQuery,
  getRatingKeyboard,
  applyTaskRatingByTgUser,
  applyTaskReworkByTgUser,
  notifyTaskSubmittedForReview,
  notifyTaskSubmitted,
  notifyNewUserRegistered,
  notifyTaskGraded,
  notifyTaskRework,
  notifyTaskForceAssigned,
  notifyTaskComment,
  notifyTaskNewComment,
  notifyUserApproved,
  sendTestNotification,
  testTelegramConnection,
  initTelegramBot,
  registerBotCommands,
  botWorker,
  persistTelegramBinding,
  removeTelegramBinding,
  findLinkedTelegramUser,
  syncTelegramBindings,
  getTelegramBindings
};

