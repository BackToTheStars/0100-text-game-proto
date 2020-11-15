const Turn = require("../models/Turn");
const bunyan = require('bunyan');
const log = bunyan.createLogger({name: 'turns', level: 'info'});

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
    // log.debug(`Ending ... ${arguments.callee.name}`);
    res.json(turnModel); // new true говорит отдать новую модель, а не старую
}

async function saveTurn (req, res) {
    log.debug(`Entering ... ${arguments.callee.name}`);
    let { turn } = req.body; // деструктуризатор
    // console.log(JSON.stringify(turn));
    delete turn._id;
    const turnModel = new Turn(turn);
    if(turn.contentType === 'comment') {
        turnModel.header = 'comment';
    }
    await turnModel.save();
    res.json(turnModel);
};

async function getTurns (req, res) {
    // log.debug(`Entering ... ${arguments.callee.name}`);
    const turns = await Turn.find();
    // log.debug(`Ending ... ${arguments.callee.name}`);
    res.json(turns);
};

async function updateCoordinates (req, res) {
    const time = Date.now();
    const { turns = [] } = req.body;
    const items = [];
    for (let turn of turns) {
        const { id, x, y, height, width, contentType, scrollPosition } = turn;

        // Turn.findOneAndUpdate({
        //     _id: id
        // }, {
        //     x, y, height, width, contentType, scrollPosition
        // })

        const turnModel = await Turn.findById(id);
        turnModel.x = x;
        turnModel.y = y;
        turnModel.height = height;
        turnModel.width = width;
        turnModel.contentType = contentType; // @todo: delete
        turnModel.scrollPosition = scrollPosition;

        turnModel.save();

        items.push({
            id: turnModel._id
        })
    }
    console.log((Date.now() - time) / 1000);
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
