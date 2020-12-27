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

app.put("/turns/coordinates", turnsController.updateCoordinates);


app.get("/games", gameController.getGames);
app.post("/games", gameController.createGame);
app.get("/games/:id", gameController.getGame);

app.get("/game", gameController.getItem);
app.put("/game/red-logic-lines", gameController.updateRedLogicLines);   // camelCase в endpoints не используют
app.post("/game/red-logic-lines", gameController.createRedLogicLine);
app.delete("/game/red-logic-lines", gameController.deleteRedLogicLines);

// 5f7e843151be1669dc611045
app.get("/game-classes", gameMiddleware, rulesCanView, gameClassesController.getGameClasses);
app.get("/game-classes/:id", gameClassesController.getGameClass);
app.post("/game-classes", gameClassesController.createGameClass);
app.put("/game-classes/:id", gameClassesController.updateGameClass);
app.delete("/game-classes/:id", gameClassesController.deleteGameClass);

// app.get("/gameClasses", gameClassesController.getGameClasses)
// app.post("/gameClass", gameClassesController.saveGameClass);
// app.delete("/gameClass", gameClassesController.deleteGameClass);
// app.post("/gameClass/addSubclass", gameClassesController.gameClassAddSubclass);

app.get("/turns", gameMiddleware, rulesCanView, turnsController.getTurns);
app.post("/turns", gameMiddleware, rulesCanEdit, turnsController.saveTurn);
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














