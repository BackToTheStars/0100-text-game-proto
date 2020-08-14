require("./models/db");
let express = require('express');
const turnsController = require("./controllers/turns")
let mongo = require('mongodb');
let config = require('./config.json');
let app = express();

let jsonParser = express.json();

app.use('/', express.static(__dirname + "/public/"));   // загружает index.html
app.use('/node_modules', express.static(__dirname + "/node_modules/"));

app.listen(config.port, () => {
    console.log("Server started on port " + config.port);
    console.log("App is running on http://localhost:3000/");
});

mongo.connect(config.mongo.url, (err, client) => {

    if (err) {
        console.log("error with db");
        return;
    } else {
        console.log("Server connected to the database");
    }

    let db = client.db(config.mongo.dbname);
    // let turnsColl = db.collection(config.mongo.collections.turns);
    let commentsColl = db.collection(config.mongo.collections.comments);
    let classesColl = db.collection(config.mongo.collections.classes);

    app.post("/saveTurn", jsonParser, turnsController.saveTurn);
    app.get("/getTurns", turnsController.getTurns);

    app.get("/getClasses", (request, response) => {
        classesColl.find({}).toArray((err, res) => {
            if (err) {
                response.status(503).send("cant get classes from db");
            } else {
                response.status(200).send(JSON.stringify(res));
            }
        })
    })

    app.get("/getComments", (request, response)=>{
        commentsColl.find({}).toArray( (err, res)=> {
            if (err){
                response.status(503).send("cant get comments from db");
            } else {
                response.status(200).send(JSON.stringify(res));
            }
        })
    })

});