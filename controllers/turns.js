const Turn = require("../models/Turn");
const bunyan = require('bunyan');
const log = bunyan.createLogger({name: 'turns', level: 'debug'});

async function updateTurn (req, res) {
    log.debug(`Entering ... ${arguments.callee.name}`);
    const { turn } = req.body;
    const turnModel = await Turn.findByIdAndUpdate(turn._id, turn, { new: true });   //функция ищет по ид и апдейтит
    log.debug(`Ending ... ${arguments.callee.name}`);
    res.json(turnModel); // new true говорит отдать новую модель, а не старую
}

async function deleteTurn (req, res) {
    log.debug(`Entering ... ${arguments.callee.name}`);
    const { turn } = req.body;
    const turnModel = await Turn.findByIdAndRemove(turn._id);   //функция ищет по ид и удаляет
    log.debug(`Ending ... ${arguments.callee.name}`);
    res.json(turnModel); // new true говорит отдать новую модель, а не старую
}

async function saveTurn (req, res) {
    log.debug(`Entering ... ${arguments.callee.name}`);
    const { turn } = req.body; // деструктуризатор
    console.log(JSON.stringify(turn));
    const turnModel = new Turn(turn);
    if(turn.contentType === 'comment') {
        turnModel.header = 'comment';
    }
    await turnModel.save();
    log.debug(`Ending ... ${arguments.callee.name}`);
    res.json(turnModel);
};

async function getTurns (req, res) {
    log.debug(`Entering ... ${arguments.callee.name}`);
    const turns = await Turn.find();
    log.debug(`Ending ... ${arguments.callee.name}`);
    res.json(turns);
};

async function updateCoordinates (req, res) {
    log.debug(`Entering ... ${arguments.callee.name}`);
    const { turns = [] } = req.body;
    const items = [];
    for (let turn of turns) {
        //log.debug(`${arguments.callee.name}: turn = ${JSON.stringify(turn)}`);
        const { id, x, y, height, width, contentType, scrollPosition } = turn;
        const turnModel = await Turn.findById(id);
        //log.debug(`${arguments.callee.name}: turnModel = ${JSON.stringify(turnModel)}`);
        turnModel.x = x;
        turnModel.y = y;
        turnModel.height = height;
        turnModel.width = width;
        turnModel.contentType = contentType;
        turnModel.scrollPosition = scrollPosition;

        await turnModel.save();
        items.push(turnModel)
    }
    log.debug(`Ending ... ${arguments.callee.name}`);
    res.json({
        success: true,
        items
    });
}

module.exports = {
    saveTurn,
    getTurns,
    updateCoordinates,
    updateTurn,
    deleteTurn
};
