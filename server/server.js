require("dotenv").config()
require("./models/db");
const cors = require("cors");

let express = require('express');
const turnsController = require("./controllers/turns");
const gameClassesController = require("./controllers/gameClasses");
const gameController = require("./controllers/game");
let app = express();

const port = process.env.PORT || 3000;

let jsonParser = express.json();

app.use(cors());
app.use('/', express.static(__dirname + "/../client/public/"));   // загружает index.html
app.use(jsonParser);

app.put("/turns/coordinates", turnsController.updateCoordinates);

app.get("/gameClasses", gameClassesController.getGameClasses)
app.post("/gameClass", gameClassesController.saveGameClass);
app.delete("/gameClass", gameClassesController.deleteGameClass);
// app.post("/gameClass/addSubclass", gameClassesController.gameClassAddSubclass);

app.post("/updateTurn", jsonParser, turnsController.updateTurn);
app.post("/saveTurn", jsonParser, turnsController.saveTurn);
app.delete("/deleteTurn", turnsController.deleteTurn);
app.get("/getTurns", turnsController.getTurns);

app.get("/game", gameController.getItem);
app.put("/game/red-logic-lines", gameController.updateRedLogicLines);   // camelCase в endpoints не используют
app.post("/game/red-logic-lines", gameController.createRedLogicLine);
app.delete("/game/red-logic-lines", gameController.deleteRedLogicLines);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});














