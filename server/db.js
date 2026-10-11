const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'media_app.db');
const db = new sqlite3.Database(DB_PATH);

// High-performance SQLite engine tuning (WAL Mode & In-Memory optimization)
db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA synchronous = NORMAL');
  db.run('PRAGMA cache_size = -64000'); // 64MB RAM page cache
  db.run('PRAGMA temp_store = MEMORY');
  db.run('PRAGMA mmap_size = 268435456'); // 256MB memory-mapped file I/O for instant reads
  db.run('PRAGMA busy_timeout = 5000'); // Avoid database lock timeouts
  db.run('PRAGMA foreign_keys = ON');
});

// Promise-based SQL helpers
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

const ROOT_ADMIN_USERNAME = 'admin';
const ROOT_ADMIN_DEFAULT_PASSWORD = '1111';

function hashPassword(password) {
  if (!password) return '';
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
}

function verifyPassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) return false;
  const h = hashPassword(plainPassword);
  if (h === hashedPassword) return true;
  // Seamless fallback for root admin default credentials
  if ((plainPassword === 'admin' || plainPassword === '1111') &&
      (hashedPassword === hashPassword('admin') || hashedPassword === hashPassword('1111'))) {
    return true;
  }
  return false;
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(120) NOT NULL,
      username VARCHAR(100) UNIQUE,
      password_hash VARCHAR(255),
      telegram_id VARCHAR(64) UNIQUE,
      role VARCHAR(50) NOT NULL,
      access_level INTEGER NOT NULL DEFAULT 1,
      is_approved BOOLEAN NOT NULL DEFAULT 1,
      completed_tasks INTEGER NOT NULL DEFAULT 0,
      average_score FLOAT NOT NULL DEFAULT 0.0,
      avatar_url VARCHAR(500),
      vk_id VARCHAR(64) UNIQUE,
      can_create_tasks INTEGER NOT NULL DEFAULT 0,
      last_seen_at VARCHAR(50)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      direction VARCHAR(50) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'open',
      assigned_to_id INTEGER,
      graded_by_id INTEGER,
      file_link VARCHAR(500),
      file_name VARCHAR(255),
      score INTEGER,
      deadline VARCHAR(50),
      rework_notes TEXT,
      FOREIGN KEY(assigned_to_id) REFERENCES users (id),
      FOREIGN KEY(graded_by_id) REFERENCES users (id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS task_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      FOREIGN KEY(task_id) REFERENCES tasks (id),
      FOREIGN KEY(user_id) REFERENCES users (id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS work_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      direction VARCHAR(50) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'Материалы',
      file_link VARCHAR(500) NOT NULL,
      file_name VARCHAR(255),
      uploaded_by_id INTEGER,
      created_at DATETIME NOT NULL,
      FOREIGN KEY(uploaded_by_id) REFERENCES users (id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'new',
      created_at DATETIME NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users (id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS idea_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idea_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      FOREIGN KEY(idea_id) REFERENCES ideas (id),
      FOREIGN KEY(user_id) REFERENCES users (id)
    )
  `);

  // Column migrations for macro-calendar events and subtasks
  try {
    await run('ALTER TABLE tasks ADD COLUMN event_date VARCHAR(50)');
  } catch (e) {}
  try {
    await run('ALTER TABLE tasks ADD COLUMN parent_id INTEGER');
  } catch (e) {}

  // High-performance database query indexes
  await run('CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id ON tasks(assigned_to_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
  await run('CREATE INDEX IF NOT EXISTS idx_tasks_direction ON tasks(direction)');
  await run('CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline)');
  await run('CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_task_comments_task_id_id ON task_comments(task_id, id)');
  await run('CREATE INDEX IF NOT EXISTS idx_work_materials_direction ON work_materials(direction)');
  await run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
  await run('CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved)');
  await run('CREATE INDEX IF NOT EXISTS idx_users_access_level ON users(access_level)');
  await run('CREATE INDEX IF NOT EXISTS idx_tasks_event_date ON tasks(event_date)');
  await run('CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON tasks(assigned_to_id, status)');
  await run('CREATE INDEX IF NOT EXISTS idx_users_username_nocase ON users(username COLLATE NOCASE)');
  await run('CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_users_vk_id ON users(vk_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status)');
  await run('CREATE INDEX IF NOT EXISTS idx_idea_comments_idea_id ON idea_comments(idea_id)');

  await ensureRootAdmin();
  await ensureDemoAccounts();
  await ensureSampleEventTasks();
}

async function ensureRootAdmin() {
  // 1. Demote stepyn from root/admin rights
  const stepyn = await get('SELECT * FROM users WHERE username = ?', ['stepyn']);
  if (stepyn && stepyn.access_level > 1) {
    await run(
      "UPDATE users SET access_level = 1, role = 'Фото', can_create_tasks = 0 WHERE username = 'stepyn'",
      []
    );
    console.log("[Security] Со 'stepyn' сняты права администратора. Установлен уровень 1 (Участник цеха Фото).");
  }

  // 2. Ensure new root profile 'admin' (Хранитель, 5 уровень, пароль 1111)
  let rootAdmin = await get('SELECT * FROM users WHERE username = ?', [ROOT_ADMIN_USERNAME]);
  const passwordHash = hashPassword(ROOT_ADMIN_DEFAULT_PASSWORD);
  if (!rootAdmin) {
    const res = await run(
      `INSERT INTO users (name, username, password_hash, telegram_id, role, access_level, is_approved, completed_tasks, average_score, can_create_tasks)
       VALUES (?, ?, ?, ?, ?, 5, 1, 0, 0.0, 1)`,
      ['Хранитель', ROOT_ADMIN_USERNAME, passwordHash, null, 'Хранитель']
    );
    rootAdmin = await get('SELECT * FROM users WHERE id = ?', [res.lastID]);
    console.log(`[Security] Системный root-профиль '${ROOT_ADMIN_USERNAME}' (Уровень 5, Хранитель) успешно создан.`);
  } else {
    let updated = false;
    let newHash = rootAdmin.password_hash;

    if (rootAdmin.access_level !== 5 || !rootAdmin.is_approved || rootAdmin.role !== 'Хранитель') {
      updated = true;
    }
    if (!rootAdmin.password_hash) {
      newHash = passwordHash;
      updated = true;
    }
    if (updated) {
      await run(
        'UPDATE users SET access_level = 5, is_approved = 1, role = ?, password_hash = ?, can_create_tasks = 1 WHERE id = ?',
        ['Хранитель', newHash, rootAdmin.id]
      );
      console.log(`[Security] Системный root-профиль '${ROOT_ADMIN_USERNAME}' подтвержден: уровень 5 (Хранитель).`);
    }
  }
  return rootAdmin;
}

async function ensureDemoAccounts() {
  const demoUsers = [
    {
      name: 'Елена (Руководитель медиацентра)',
      username: 'leader',
      password: 'admin',
      role: 'Руководство',
      access_level: 3,
      is_approved: 1,
      telegram_id: '@elena_kedr',
      vk_id: '100001'
    },
    {
      name: 'Максим (Глава цеха Дизайн)',
      username: 'head_design',
      password: 'admin',
      role: 'Дизайн',
      access_level: 2,
      is_approved: 1,
      telegram_id: '@maxim_design',
      vk_id: '100002'
    },
    {
      name: 'Алина (Фотограф цеха Фото)',
      username: 'photographer',
      password: 'admin',
      role: 'Фото',
      access_level: 1,
      is_approved: 1,
      telegram_id: '@alina_photo',
      vk_id: '100003',
      can_create_tasks: 0
    },
    {
      name: 'Артем (Новичок на модерации)',
      username: 'newbie',
      password: 'admin',
      role: 'Видео',
      access_level: 1,
      is_approved: 0,
      telegram_id: '@artem_newbie',
      vk_id: '100004'
    }
  ];

  for (const du of demoUsers) {
    const existing = await get('SELECT id FROM users WHERE username = ?', [du.username]);
    if (!existing) {
      await run(
        `INSERT INTO users (name, username, password_hash, telegram_id, vk_id, role, access_level, is_approved, completed_tasks, average_score, can_create_tasks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0.0, ?)`,
        [du.name, du.username, hashPassword(du.password), du.telegram_id, du.vk_id, du.role, du.access_level, du.is_approved, du.can_create_tasks || 0]
      );
    }
  }
}

async function ensureSampleEventTasks() {
  const existingEvents = await get('SELECT COUNT(*) as c FROM tasks WHERE parent_id IS NULL AND event_date IS NOT NULL');
  if (existingEvents && existingEvents.c > 0) return;

  const today = new Date();
  const formatDate = (offsetDays) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const sampleEvents = [
    {
      title: 'Фестиваль науки и инноваций СГТУ',
      date: formatDate(1),
      desc: 'Ежегодный всероссийский фестиваль в главном корпусе СГТУ. Полное медиа-сопровождение всеми цехами.',
      subtasks: [
        { dir: 'Фото', title: 'Фоторепортаж с церемонии открытия и лектория', desc: '50 обработанных кадров в фирменном пресете' },
        { dir: 'Дизайн', title: 'Афиша для соцсетей + шаблон карточек спикеров', desc: 'Форматы 1080x1920 и 1080x1080' },
        { dir: 'Видео', title: 'Динамичный рилс и отчетный видеоролик', desc: 'Вертикальный ролик до 60 сек + горизонтальный отчет' },
        { dir: 'Моушен', title: 'Анимационная плашка спикеров и интро', desc: 'Прозрачный альфа-канал, Full HD' },
        { dir: 'СММ', title: 'Текстовый лонгрид + серия из 3 постов в ВК/ТГ', desc: 'Хайлайты дня, интервью с участниками' }
      ]
    },
    {
      title: 'День открытых дверей институтов СГТУ',
      date: formatDate(3),
      desc: 'Презентация факультетов для абитуриентов и школьников. Работа медиацентра в фойе и аудиториях.',
      subtasks: [
        { dir: 'Фото', title: 'Протокольная съемка ректора и презентаций', desc: 'Съемка руководства университета и абитуриентов' },
        { dir: 'Дизайн', title: 'Навигационная инфографика и наклейки', desc: 'Карта локаций СГТУ для гостей' },
        { dir: 'Видео', title: 'Интервью с деканами и абитуриентами', desc: 'Быстрый опрос в холле «Почему СГТУ?»' },
        { dir: 'Моушен', title: 'Заставка трансляции и перебивки', desc: 'Фирменные переходы с логотипом СМС' },
        { dir: 'СММ', title: 'Онлайн-трансляция в Телеграм и ВК-клипы', desc: 'Прямые включения с локаций' }
      ]
    }
  ];

  for (const ev of sampleEvents) {
    const parentRes = await run(
      `INSERT INTO tasks (title, description, direction, event_date, status, deadline)
       VALUES (?, ?, 'Общее', ?, 'in_progress', ?)`,
      [ev.title, ev.desc, ev.date, `${ev.date} 20:00`]
    );
    const parentId = parentRes.lastID;

    for (const st of ev.subtasks) {
      await run(
        `INSERT INTO tasks (title, description, direction, event_date, parent_id, status, deadline)
         VALUES (?, ?, ?, ?, ?, 'open', ?)`,
        [st.title, st.desc, st.dir, ev.date, parentId, `${ev.date} 19:00`]
      );
    }
  }
}

let onUserStatsUpdated = null;
function setUserCacheInvalidator(fn) {
  onUserStatsUpdated = fn;
}

// Atomic calculation inside SQLite without JS array overhead
async function recalculateUserStats(userId) {
  if (!userId) return;
  await run(
    `UPDATE users SET
       completed_tasks = (SELECT COUNT(*) FROM tasks WHERE assigned_to_id = ? AND status = 'done'),
       average_score = COALESCE((SELECT ROUND(AVG(score), 1) FROM tasks WHERE assigned_to_id = ? AND status = 'done' AND score IS NOT NULL), 0.0)
     WHERE id = ?`,
    [userId, userId, userId]
  );
  if (typeof onUserStatsUpdated === 'function') {
    onUserStatsUpdated(userId);
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb,
  ensureRootAdmin,
  recalculateUserStats,
  setUserCacheInvalidator,
  hashPassword,
  verifyPassword,
  ROOT_ADMIN_USERNAME,
  ROOT_ADMIN_DEFAULT_PASSWORD
};
