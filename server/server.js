require("dotenv").config()
require("./models/db");
const cors = require("cors");

let express = require('express');
const turnsController = require("./controllers/turns");
const gameClassesController = require("./controllers/gameClasses");
const gameController = require("./controllers/game");
const User = require('./models/User');
const SecurityLayer = require('./services/SecurityLayer');
let app = express();

const port = process.env.PORT || 3000;

let jsonParser = express.json();

const gameMiddleware = async (req, res, next) => {
  const { hash } = req.query;
  const {gameId, userId, rules} = await SecurityLayer.getInfo(hash);
  if(!gameId) {
    // @todo: вынести в отдельный тип ошибок
    const error = new Error('Игра не найдена');
    error.statusCode = 404;
    return next(error);
  }
  req.gameInfo = {gameId, userId, rules};
  next();                // пропускаем в следующий слой
}

const rulesCanView = async (req, res, next) => {
  // gameId - могут ли редактировать все
  if(req.gameInfo.rules.indexOf(User.rules.RULE_VIEW) === -1) {
    const error = new Error('Просмотр не доступен');
    error.statusCode = 403;
    return next(error);
  }
  next();
}

const rulesCanEdit = async (req, res, next) => {
  // gameId - могут ли редактировать все
  if(req.gameInfo.rules.indexOf(User.rules.RULE_EDIT) === -1) {
    const error = new Error('Редактирование не доступно');
    error.statusCode = 403;
    return next(error);
  }
  next();
}

app.use(cors());
app.use('/', express.static(__dirname + "/../client/public/"));   // загружает index.html
app.use(jsonParser);

app.get("/games", gameController.getGames);
app.post("/games", gameController.createGame);
app.get("/game", gameMiddleware, rulesCanView, gameController.getGame);

app.put("/game/red-logic-lines", gameMiddleware, rulesCanView, gameController.updateRedLogicLines);   // camelCase в endpoints не используют
app.post("/game/red-logic-lines", gameMiddleware, rulesCanEdit, gameController.createRedLogicLine);
app.delete("/game/red-logic-lines", gameMiddleware, rulesCanEdit, gameController.deleteRedLogicLines);

app.get("/game-classes", gameMiddleware, rulesCanView, gameClassesController.getGameClasses);
app.get("/game-classes/:id", gameMiddleware, rulesCanEdit, gameClassesController.getGameClass);
app.post("/game-classes", gameMiddleware, rulesCanEdit, gameClassesController.createGameClass);
app.put("/game-classes/:id", gameMiddleware, rulesCanEdit, gameClassesController.updateGameClass);
app.delete("/game-classes/:id", gameMiddleware, rulesCanEdit, gameClassesController.deleteGameClass);

app.get("/turns", gameMiddleware, rulesCanView, turnsController.getTurns);
app.post("/turns", gameMiddleware, rulesCanEdit, turnsController.saveTurn);
app.put("/turns/coordinates", gameMiddleware, rulesCanEdit, turnsController.updateCoordinates);
app.put("/turns/:id", gameMiddleware, rulesCanEdit, turnsController.updateTurn);
app.delete("/turns/:id", gameMiddleware, rulesCanEdit, turnsController.deleteTurn);


app.use((err, req, res, next) => {
    const { statusCode = 500, message } = err;
    console.log({err})
    res
      .status(statusCode)
      .send({
        // проверяем статус и выставляем сообщение в зависимости от него
        message: statusCode === 500
          ? 'На сервере произошла ошибка'
          : message,
      });
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});














