const Turn = require("../models/Turn");
const bunyan = require('bunyan');
const log = bunyan.createLogger({name: 'turns', level: 'info'});

async function updateTurn (req, res) {
    log.debug(`Entering ... ${arguments.callee.name}`);
    const { id } = req.params;
    const { gameId } = req.gameInfo;
    const turn = req.body;
    const turnModel = await Turn.findOneAndUpdate({
        gameId,
        _id: id
    }, {
        ...turn,
        _id: id,
        gameId
    }, { new: true });   //функция ищет по ид и апдейтит
    log.debug(`Ending ... ${arguments.callee.name}`);
    res.json({
        item: turnModel
    }); // new true говорит отдать новую модель, а не старую
}

async function deleteTurn (req, res) {
    log.debug(`Entering ... ${arguments.callee.name}`);
    const { gameId } = req.gameInfo;
    const { id } = req.params;
    const turnModel = await Turn.findOneAndRemove({
        _id: id,
        gameId
    });   //функция ищет по ид и удаляет
    // log.debug(`Ending ... ${arguments.callee.name}`);
    res.json({
        item: turnModel
    }); // new true говорит отдать новую модель, а не старую
}

async function saveTurn (req, res) {         // бусы на нитке - функции в Node все работают с req res
    const { gameId } = req.gameInfo;
    log.debug(`Entering ... ${arguments.callee.name}`);
    let turn = req.body; // деструктуризатор
    // console.log(JSON.stringify(turn));
    delete turn._id;
    const turnModel = new Turn({
        ...turn,
        gameId
    });
    // @todo: пересмотреть
    if(turn.contentType === 'comment') {
        turnModel.header = 'comment';
    }
    await turnModel.save();
    res.json({
        item: turnModel
    });
};

async function getTurns (req, res) {
    const { gameId } = req.gameInfo;
    // log.debug(`Entering ... ${arguments.callee.name}`);
    const turns = await Turn.find({
        gameId
    });
    // log.debug(`Ending ... ${arguments.callee.name}`);
    res.json({
        items: turns
    });
};

async function updateCoordinates (req, res) {
    const { gameId } = req.gameInfo;
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

        const turnModel = await Turn.findOne({_id: id, gameId});
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
    // console.log((Date.now() - time) / 1000);
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
