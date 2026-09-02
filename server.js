require('dotenv').config();
require('./config/db');

const { assertEnvCodeHashLength } = require('./config/game/code');
assertEnvCodeHashLength();

const { assertEnvLoginRateLimit } = require('./modules/core/middlewares/rateLimit');
assertEnvLoginRateLimit();

const cors = require('cors');
const express = require('express');

const { corsOptionsDelegate } = require('./config/cors');

const adminAuthRoutes = require('./modules/admin/routes/auth');
const adminGamesRoutes = require('./modules/admin/routes/games');
const adminTurnsRoutes = require('./modules/admin/routes/turns');
const adminLogsRoutes = require('./modules/admin/routes/logs');
const adminTgLogsRoutes = require('./modules/admin/routes/tg-logs');
const adminMediaRoutes = require('./modules/admin/routes/media');

const adminScriptsRoutes = require('./modules/admin/routes/scripts');
const backupRoutes = require('./modules/backups/routes/backups');
const snapshotRoutes = require('./modules/backups/routes/snapshots');

const lobbyRoutes = require('./modules/lobby/routes/lobby');

const codeRoutes = require('./modules/game/routes/codes');
const gameRoutes = require('./modules/game/routes/game');
const turnRoutes = require('./modules/game/routes/turns');
const lineRoutes = require('./modules/game/routes/lines');
const classRoutes = require('./modules/game/routes/classes');

const {
  gameMiddleware,
} = require('./modules/game/middlewares/games');

const {
  adminMiddleware,
  isAdmin,
} = require('./modules/admin/middlewares/auth');

// Сорвавшийся промис не должен убивать API: в Node >= 15 необработанный reject
// по умолчанию завершает процесс, и один невалидный документ в базе гасил
// сервер целиком (см. brain-platform/docs/archive/save-field-fix-plan.md).
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

const app = express();
const port = process.env.PORT || 3000;

// Прод стоит за nginx (ровно один хоп, порты контейнеров опубликованы только на
// loopback): доверяем последнему прокси, чтобы rate-limit на ручках логина видел
// клиентский IP из X-Forwarded-For, а не адрес nginx. Больше `trust proxy` нигде
// не используется — req.ip/req.protocol в коде не читаются.
app.set('trust proxy', 1);

// Без CORS_ORIGINS API отвечает всем, как и раньше; со списком origin'ов —
// только перечисленным. Публичные GET /lobby/* (и их preflight) открыты
// всегда — делегат сам решает по пути запроса, см. config/cors.js.
app.use(cors(corsOptionsDelegate));
app.use(express.static('public'));
app.use(express.json());

if (process.env.BOT_MODE === 'hook') {
  const bot = require('./bot');
  const webhookPath = `/bot${process.env.BOT_TOKEN}`;
  const secretToken = process.env.BOT_WEBHOOK_SECRET || undefined;

  // server.js — единственный владелец webhook (bot.js в hook-режиме себя не запускает).
  app.use(bot.webhookCallback(webhookPath, { secretToken }));

  // Регистрируем webhook на выделенном домене (BOT_WEBHOOK_BASE_URL), с фолбэком на API_URL.
  const base =
    process.env.BOT_WEBHOOK_BASE_URL ||
    process.env.API_URL ||
    'http://localhost:3000';
  bot.telegram
    .setWebhook(
      `${base}${webhookPath}`,
      secretToken ? { secret_token: secretToken } : undefined
    )
    .then(() => console.log(`Webhook set: ${base}${webhookPath}`))
    .catch((err) => console.error('setWebhook failed:', err.message));
}

// ADMIN ROUTES
app.use('/admin/auth', adminAuthRoutes);
const adminRoutes = {
  '/admin/games': adminGamesRoutes,
  '/admin/turns': adminTurnsRoutes,
  '/admin/scripts': adminScriptsRoutes,

  '/admin/backups': backupRoutes,
  '/admin/snapshots': snapshotRoutes,

  '/admin/logs': adminLogsRoutes,
  '/admin/tg-logs': adminTgLogsRoutes,

  '/admin/media': adminMediaRoutes,
};

// добавляем middleware для всех админских роутов
for (let route in adminRoutes) {
  app.use(route, adminMiddleware, isAdmin, adminRoutes[route]);
}

// LOBBY ROUTES
app.use('/lobby', lobbyRoutes);

// GAME ROUTES
app.use('/codes', codeRoutes);
app.use('/game', gameRoutes);
app.use('/turns', gameMiddleware, turnRoutes);
app.use('/lines', gameMiddleware, lineRoutes);
app.use('/classes', gameMiddleware, classRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    message: '404 Not Found',
  });
});

app.use((err, req, res, next) => {
  const { statusCode = 500, message } = err;
  console.log({ err });
  res.status(statusCode).send({
    // проверяем статус и выставляем сообщение в зависимости от него
    message: statusCode === 500 ? 'На сервере произошла ошибка' : message,
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
