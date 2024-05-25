require('dotenv').config();
require('./models/db');

const cors = require('cors');
const path = require('path');

let express = require('express');
const jwt = require('jsonwebtoken');

const newTurnRoutes = require('./modules/game/routes/turns');
const adminGamesRoutes = require('./modules/admin/routes/games');
const adminTurnsRoutes = require('./modules/admin/routes/turns');
const backupRoutes = require('./modules/backups/routes/backups');
const snapshotRoutes = require('./modules/backups/routes/snapshots');

const turnsController = require('./controllers/turns');
const gameClassesController = require('./controllers/gameClasses');
const gameController = require('./controllers/game');
const authController = require('./controllers/auth');
const lobbyController = require('./modules/lobby/controllers/lobby');
const User = require('./models/User');

const SecurityLayer = require('./services/SecurityLayer');
const { API_URL } = require('./config/url');

let bot;
let token = process.env.BOT_TOKEN;
if (process.env.BOT_MODE === 'hook') {
  bot = require('./bot');
  console.log('bot imported');
  bot.setWebHook(`${API_URL}/bot${token}`);
}

let app = express();
const { USER_MODE_ADMIN, USER_MODE_VISITOR } = User.user_modes;

const port = process.env.PORT || 3000;
const mode = process.env.USER_MODE || USER_MODE_VISITOR; // может быть ADMIN, VISITOR, PLAYER, ...

let jsonParser = express.json({ limit: '6mb' });

const gameMiddleware = async (req, res, next) => {
  const { hash } = req.query; // после request?...
  const gameToken = req.headers['game-token'];
  const { gameId, roles } = await SecurityLayer.getInfo(hash);
  if (!gameId) {
    // @todo: вынести в отдельный тип ошибок
    const error = new Error('Игра не найдена');
    error.statusCode = 404;
    return next(error);
  }

  if (gameToken) {
    jwt.verify(gameToken, process.env.JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.gameInfo = {
          gameId,
          roles: [...roles, decoded.data.role],
          nickname: decoded.data.nickname || 'Unknown', // проверка того, что пользователь зашёл
        };
      } else {
        req.gameInfo = { gameId, roles };
      }
      next();
    });
  } else {
    req.gameInfo = { gameId, roles };
    next(); // пропускаем в следующий слой
  }
};

const rulesCanView = async (req, res, next) => {
  // gameId - могут ли редактировать все
  if (req.gameInfo.roles.indexOf(User.roles.ROLE_GAME_VISITOR) === -1) {
    const error = new Error('Просмотр не доступен');
    error.statusCode = 403;
    return next(error);
  }
  next();
};

const rulesCanEdit = async (req, res, next) => {
  // gameId - могут ли редактировать все
  if (req.gameInfo.roles.indexOf(User.roles.ROLE_GAME_PLAYER) === -1) {
    const error = new Error('Редактирование не доступно');
    error.statusCode = 403;
    return next(error);
  }
  next();
};

const rulesEndpoint = (ruleName) => async (req, res, next) => {
  for (let role of req.gameInfo.roles) {
    if (User.ROLES[role].rules.indexOf(ruleName) !== -1) {
      // если он там есть
      return next();
    }
  }

  const error = new Error('Недостаточно прав доступа.');
  error.statusCode = 403;
  return next(error);
};

app.use(cors());

// app.use('/public', express.static(path.join(__dirname, 'public'))); // загружает index.html
app.use(express.static('public'));

// нужна для скриншотов minimap
app.use(jsonParser);

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

app.use('/new-turns', gameMiddleware, newTurnRoutes);

const adminRoutes = {
  '/admin/games': adminGamesRoutes,
  '/admin/turns': adminTurnsRoutes,
  '/backups': backupRoutes,
  '/snapshots': snapshotRoutes,
};

// добавляем middleware для всех админских роутов
for (let route in adminRoutes) {
  app.use(
    route,
    authController.adminMiddleware,
    authController.isAdmin,
    adminRoutes[route]
  );
}

app.post('/login', authController.login);

app.get('/codes/login/:hash', authController.codeLogin);

app.get('/games/screenshot', gameMiddleware, gameController.getScreenshot);
app.get('/games', authController.adminMiddleware, gameController.getGames);
app.get(
  '/games/last-turns',
  authController.adminMiddleware,
  gameController.getLastTurns
);

app.post(
  '/games/tokens',
  gameMiddleware,
  rulesEndpoint(User.rules.RULE_TURNS_CRUD),
  gameController.getTokens
);

app.post('/games', gameController.createGame);
// if (mode == USER_MODE_ADMIN) {
app.put(
  '/game',
  gameMiddleware, // проверяет что в адресе есть hash, находит игру и права юзера и права в этой игре
  authController.adminMiddleware, // проверяет является ли юзер superAdmin
  gameController.editGame
); // требует privilege elevation
app.put('/games/viewport', gameMiddleware, gameController.updateViewPort);
app.delete(
  '/game',
  gameMiddleware,
  authController.adminMiddleware,
  gameController.deleteGame
); // требует privilege elevation
// }

app.get(
  '/game',
  gameMiddleware,
  rulesEndpoint(User.rules.RULE_VIEW),
  gameController.getGame
);

app.post(
  '/lines',
  gameMiddleware,
  rulesEndpoint(User.rules.RULE_TURNS_CRUD),
  gameController.createRedLogicLine2
);

app.delete(
  '/lines',
  gameMiddleware,
  rulesEndpoint(User.rules.RULE_TURNS_CRUD),
  gameController.deleteRedLogicLines2
);

app.post(
  '/codes',
  gameMiddleware,
  authController.adminMiddleware,
  gameController.addCode
);

app.get(
  '/classes',
  gameMiddleware,
  rulesCanView,
  gameClassesController.getGameClasses
);
app.get(
  '/classes/:id',
  gameMiddleware,
  rulesCanView,
  gameClassesController.getGameClass
);
app.post(
  '/classes',
  gameMiddleware,
  rulesEndpoint(User.rules.RULE_TURNS_CRUD),
  gameClassesController.createGameClass
);
app.put(
  '/classes/:id',
  gameMiddleware,
  rulesEndpoint(User.rules.RULE_TURNS_CRUD),
  gameClassesController.updateGameClass
);
app.delete(
  '/classes/:id',
  gameMiddleware,
  rulesEndpoint(User.rules.RULE_TURNS_CRUD),
  gameClassesController.deleteGameClass
);

app.get('/turns', gameMiddleware, rulesCanView, turnsController.getTurns);
app.post(
  '/turns',
  gameMiddleware,
  // rulesCanEdit,
  rulesEndpoint(User.rules.RULE_TURNS_CRUD),
  turnsController.createTurn
);
app.put(
  '/turns/coordinates',
  gameMiddleware,
  //rulesCanEdit,
  rulesEndpoint(User.rules.RULE_TURNS_CRUD),

  turnsController.updateCoordinates
);
app.put(
  '/turns/:id',
  gameMiddleware,
  rulesEndpoint(User.rules.RULE_TURNS_CRUD),
  turnsController.updateTurn
);
app.delete(
  '/turns/:id/quote/:quoteId',
  gameMiddleware,
  rulesEndpoint(User.rules.RULE_TURNS_CRUD),
  turnsController.deleteQuote
);
app.delete(
  '/turns/:id',
  gameMiddleware,
  rulesEndpoint(User.rules.RULE_TURNS_CRUD),
  turnsController.deleteTurn
);

// ---------------------- Temp Turn work ------------------------

app.post(
  '/temp-turns',
  // gameMiddleware,
  // rulesCanEdit,
  // rulesEndpoint(User.rules.RULE_TURNS_CRUD),
  turnsController.createTempTurn
);

app.get(
  '/temp-turns',
  gameMiddleware,
  rulesCanView,
  turnsController.getTempTurns
);

// --------------------------------------------------------------

app.get('/lobby/games', lobbyController.getGames);

app.get('/lobby/turns', lobbyController.getTurns);

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
