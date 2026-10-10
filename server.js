require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const db = require('./server/db');
const { getCurrentUserMiddleware } = require('./server/auth');
const apiRouter = require('./server/api');
const telegramService = require('./server/telegramService');
const vkService = require('./server/vkService');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static uploads directory with 1-day caching
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir, { maxAge: '1d' }));

// Auth & Session caching middleware
app.use(getCurrentUserMiddleware);

// REST API routes
app.use('/api', apiRouter);

// Serve compiled Vue 3 SPA frontend (dist)
const distDir = path.resolve(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: `Маршрут API «${req.originalUrl}» не найден.` });
    }
    res.sendFile('index.html', { root: distDir }, (err) => {
      if (err && !res.headersSent) {
        next(err);
      }
    });
  });
} else {
  // If dist is not built yet, return helpful status
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>КЕДР СГТУ API</title><meta charset="utf-8"></head>
      <body style="background:#070918;color:#eee;font-family:sans-serif;padding:40px;text-align:center;">
        <h1 style="color:#a855f7;">🌲 Медиацентр «КЕДР СГТУ» (Vue 3 API)</h1>
        <p>Бэкенд успешно запущен на порту ${PORT}!</p>
        <p>Соберите фронтенд командой <code>npm run build</code> или запустите Vite через <code>npm run dev:client</code>.</p>
        <p><a href="/api/auth/me" style="color:#38bdf8;">Проверить API: /api/auth/me</a></p>
      </body>
      </html>
    `);
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера: ' + err.message });
});

async function startServer() {
  await db.initDb();
  console.log('[Database] SQLite инициализирован в режиме WAL с 9 индексами.');

  // Start bots
  try {
    if (telegramService) {
      if (typeof telegramService.initTelegramBot === 'function') {
        telegramService.initTelegramBot();
      } else if (telegramService.botWorker && typeof telegramService.botWorker.start === 'function') {
        telegramService.botWorker.start();
      }
    }
  } catch (e) {
    console.error('[Telegram] Ошибка старта бота:', e.message);
  }

  try {
    if (vkService) {
      if (typeof vkService.initVkBot === 'function') {
        vkService.initVkBot();
      } else if (vkService.botWorker && typeof vkService.botWorker.start === 'function') {
        vkService.botWorker.start();
      }
    }
  } catch (e) {
    console.error('[VK] Ошибка старта бота:', e.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================================`);
    console.log(`🌲 Платформа «КЕДР СГТУ» (Vue 3 + Express + SQLite WAL)`);
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
    console.log(`========================================================`);
  });
}

startServer().catch((err) => {
  console.error('Ошибка инициализации сервера:', err);
  process.exit(1);
});
