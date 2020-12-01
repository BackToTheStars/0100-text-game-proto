require("dotenv").config()
require("./models/db");

let express = require('express');
const turnsController = require("./controllers/turns");
const gameClassesController = require("./controllers/gameClasses");
const gameController = require("./controllers/game");
const commentsController = require("./controllers/comments")
let config = require('./config.json');
let app = express();

let jsonParser = express.json();

app.use('/', express.static(__dirname + "/public/"));   // загружает index.html
app.use('/node_modules', express.static(__dirname + "/node_modules/"));
app.use(jsonParser);

// app.put("/turns/:id")
//app.post("/saveTurn", turnsController.saveTurn);
// app.get("/turns/")
//app.get("/getTurns", turnsController.getTurns);
app.put("/turns/coordinates", turnsController.updateCoordinates);

app.post("/saveGameClass", gameClassesController.saveGameClass);
app.get("/getGameClasses", gameClassesController.getGameClasses)


app.post("/updateTurn", jsonParser, turnsController.updateTurn);
app.post("/saveTurn", jsonParser, turnsController.saveTurn);
app.delete("/deleteTurn", turnsController.deleteTurn);
app.get("/getTurns", turnsController.getTurns);

app.post("/saveGameClass", jsonParser, gameClassesController.saveGameClass);
app.get("/getGameClasses", gameClassesController.getGameClasses);

app.post("/saveComment", jsonParser, commentsController.saveComment);
app.get("/getComments", commentsController.getComments);

app.get("/game", gameController.getItem);
app.put("/game/red-logic-lines", gameController.updateRedLogicLines);   // camelCase в endpoints не используют
app.post("/game/red-logic-lines", gameController.createRedLogicLine);
app.delete("/game/red-logic-lines", gameController.deleteRedLogicLines);

app.listen(config.port, () => {
    console.log("Server started on port " + config.port);
    console.log("App is running on http://localhost:3000/");
});














