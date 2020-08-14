const Turn = require("../models/Turn");

const saveTurn = async (req, res) => {
  const {turn} = req.body;
  const turnModel = new Turn(turn);
  await turnModel.save();
  res.json(turnModel);
  // turnsColl.insertOne(request.body.turn, (err, res)=> {
  //     if (err){
  //         response.status(503).send("cant create");
  //     } else {
  //         response.status(200).send(res.ops[0]);
  //     }
  // })
};

const getTurns = async (req, res) => {
  const turns = await Turn.find();
  res.json(turns);
  // turnsColl.find({}).toArray( (err, res)=> {
  //     if (err){
  //         response.status(503).send("cant get turns from db");
  //     } else {
  //         console.log('200 OK /getTurns ');
  //         res.map(el => console.log('---', el.header));
  //         response.status(200).send(JSON.stringify(res));
  //     }
  // })
};

module.exports = {
  saveTurn,
  getTurns,
};
