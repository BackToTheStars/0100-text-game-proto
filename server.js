require('dotenv').config();
require('./models/db');
const cors = require('cors');
const path = require('path');

let express = require('express');
const jwt = require('jsonwebtoken');
const turnsController = require('./controllers/turns');
const gameClassesController = require('./controllers/gameClasses');
const gameController = require('./controllers/game');
const authController = require('./controllers/auth');
const User = require('./models/User');
const SecurityLayer = require('./services/SecurityLayer');
let app = express();
const { USER_MODE_ADMIN, USER_MODE_VISITOR } = User.user_modes;

const port = process.env.PORT || 3000;
const mode = process.env.USER_MODE || USER_MODE_VISITOR; // может быть ADMIN, VISITOR, PLAYER, ...

let jsonParser = express.json();

const gameMiddleware = async (req, res, next) => {
  const { hash } = req.query; // после request?...
  const gameToken = req.headers['game-token'];
  const { gameId, userId, roles } = await SecurityLayer.getInfo(hash);
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
          userId,
          roles: [...roles, decoded.data.role],
          nickname: decoded.data.nickname || 'Unknown',
        };
      } else {
        req.gameInfo = { gameId, userId, roles };
      }
      next();
    });
  } else {
    req.gameInfo = { gameId, userId, roles };
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

app.post('/login', authController.login);

app.get('/codes/login/:hash', authController.codeLogin);

app.get('/games/screenshot', gameMiddleware, gameController.getScreenshot);
app.get('/games', authController.adminMiddleware, gameController.getGames);

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

app.put(
  '/game/red-logic-lines',
  gameMiddleware,
  rulesEndpoint(User.rules.RULE_TURNS_CRUD),
  gameController.updateRedLogicLines
); // camelCase в endpoints не используют

app.post(
  '/game/red-logic-lines',
  gameMiddleware,
  rulesEndpoint(User.rules.RULE_TURNS_CRUD),
  gameController.createRedLogicLine
);
app.delete(
  '/game/red-logic-lines',
  gameMiddleware,
  rulesEndpoint(User.rules.RULE_TURNS_CRUD),
  gameController.deleteRedLogicLines
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
  turnsController.saveTurn
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
  '/turns/:id',
  gameMiddleware,
  rulesEndpoint(User.rules.RULE_TURNS_CRUD),
  turnsController.deleteTurn
);

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
