require('dotenv').config();
require('./config/db');

const cors = require('cors');
const express = require('express');

const adminAuthRoutes = require('./modules/admin/routes/auth');
const adminGamesRoutes = require('./modules/admin/routes/games');
const adminTurnsRoutes = require('./modules/admin/routes/turns');
const backupRoutes = require('./modules/backups/routes/backups');
const snapshotRoutes = require('./modules/backups/routes/snapshots');

const lobbyRoutes = require('./modules/lobby/routes/lobby');

const codeRoutes = require('./modules/game/routes/codes');
const gameRoutes = require('./modules/game/routes/game');
const turnRoutes = require('./modules/game/routes/turns');
const lineRoutes = require('./modules/game/routes/lines');
const classRoutes = require('./modules/game/routes/classes');

const { API_URL } = require('./config/url');

const {
  gameMiddleware,
} = require('./modules/game/middlewares/games');

const {
  adminMiddleware,
  isAdmin,
} = require('./modules/admin/middlewares/auth');

let bot;
const token = process.env.BOT_TOKEN;
if (process.env.BOT_MODE === 'hook') {
  bot = require('./bot');
  console.log('bot imported');
  bot.setWebHook(`${API_URL}/bot${token}`);
}

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

if (process.env.BOT_MODE === 'hook') {
  app.post(`/bot${token}`, (req, res, next) => {
    try {
      bot.processUpdate(req.body);
      res.sendStatus(200);
      console.log('hook requested');
    } catch (error) {
      console.log(error);
      next(error);
    }
  });
}

// ADMIN ROUTES
app.use('/admin/auth', adminAuthRoutes);
const adminRoutes = {
  '/admin/games': adminGamesRoutes,
  '/admin/turns': adminTurnsRoutes,
  '/admin/backups': backupRoutes,
  '/admin/snapshots': snapshotRoutes,
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
