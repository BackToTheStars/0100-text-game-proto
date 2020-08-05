let express = require('express');
let mongo = require('mongodb');
let config = require('./config.json');
let app = express();

let jsonParser = express.json();

app.use('/', express.static(__dirname+ "/public/"));

app.listen(config.port, () => {
    console.log("server has started "+config.port);
});

mongo.connect(config.mongo.url, (err, client) => {

    if (err){
        console.log("error with db");
        return;
    } else {
        console.log("connected to db");
    }

    let db = client.db(config.mongo.dbname);
    let turnsColl = db.collection(config.mongo.collections.turns);
    let commentsColl = db.collection(config.mongo.collections.comments);
    let classesColl = db.collection(config.mongo.collections.classes);

    app.post("/saveTurn", jsonParser, (request, response) => {
        turnsColl.insertOne(request.body.turn, (err, res)=> {
            if (err){
                response.status(503).send("cant create");
            } else {
                response.status(200).send(res.ops[0]);
            }
        })
    });

    app.get("/getTurns", (request, response)=>{
        turnsColl.find({}).toArray( (err, res)=> {
            if (err){
                response.status(503).send("cant get turns from db");
            } else {
                response.status(200).send(JSON.stringify(res));
            }
        })
    })

    app.get("/getClasses", (request, response)=>{
        classesColl.find({}).toArray( (err, res)=> {
            if (err){
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