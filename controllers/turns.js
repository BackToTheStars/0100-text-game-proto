const Turn = require("../models/Turn");

const updateTurn = async (req, res) => {
    const { turn } = req.body;
    const turnModel = await Turn.findByIdAndUpdate(turn._id, turn, { new: true });   //функция ищет по ид и апдейтит
    res.json(turnModel); // new true говорит отдать новую модель, а не старую
}

const deleteTurn = async (req, res) => {
    const { turn } = req.body;
    const turnModel = await Turn.findByIdAndRemove(turn._id);   //функция ищет по ид и удаляет
    res.json(turnModel); // new true говорит отдать новую модель, а не старую
}

const saveTurn = async (req, res) => {
    const { turn } = req.body; // деструктуризатор
    console.log(JSON.stringify(turn));
    const turnModel = new Turn(turn);
    await turnModel.save();
    res.json(turnModel);
};

const getTurns = async (req, res) => {
    const turns = await Turn.find();
    res.json(turns);
};

const updateCoordinates = async (req, res) => {
    const { turns = [] } = req.body;
    const items = [];
    for (let turn of turns) {
        const { id, x, y, height, width, contentType } = turn;
        //console.log(`============================================== id: ${id}`);
        const turnModel = await Turn.findById(id);
        //console.log('====================================================');
        turnModel.x = x;
        turnModel.y = y;
        turnModel.height = height;
        turnModel.width = width;
        turnModel.contentType = contentType;
        await turnModel.save();
        items.push(turnModel)
    }
    ;
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
