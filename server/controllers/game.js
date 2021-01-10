
const Game = require("../models/Game");
const SecurityLayer = require("../services/SecurityLayer")

const createGame = async (req, res) => {
    const {
        public,
        name,
    } = req.body;

    const game = new Game({
        public,
        name,
    });

    SecurityLayer.clearGamesCache();
    await game.save();
    res.json({
        hash: SecurityLayer.getHashByGame(game),
        item: {
            name: game.name
        }
    })
}

const getGame = async (req, res) => {
    const { gameId } = req.gameInfo;
    const game = await Game.findById(gameId, {
        "_id": false,
        "name": true,
        "public": true,
        "redLogicLines": true,
    });
    // здесь может быть проверка, есть ли у пользователя доступ к игре
    res.json({
        item: game
    });
}

const editGame = async (req, res, next) => {
    try {
        const { gameId } = req.gameInfo;
        const { name } = req.body;
        const game = await Game.findById(gameId);
        if (name) {
            game.name = name;
        }
        await game.save();
        res.json({
            item: game
        })
    } catch (error) {
        next(error);
    }
}

async function deleteGame(req, res, next) {
    const { gameId } = req.gameInfo;
    // @todo
    const error = new Error('Функционал удаления временно недоступен');
    error.statusCode = 403;
    next(error);
}

const getGames = async (req, res) => {
    const games = await Game.find({}, {
        "name": true,
        "public": true
    });
    res.json({
        items: games.map(game => ({
            name: game.name,
            _id: game._id,
            public: game.public,
            hash: SecurityLayer.getHashByGame(game),
        }))
    });
}


// const getItem = async (req, res) => {
//     let game = await Game.findOne();
//     // @fixme
//     if (!game) {
//         game = new Game({
//             name: "Dev"
//         })
//         await game.save();
//     }
//     res.json({
//         item: game
//     })
// }

const createRedLogicLine = async (req, res) => {
    const { gameId } = req.gameInfo;
    const { sourceTurnId, sourceMarker, targetTurnId, targetMarker } = req.body;
    const game = await Game.findById(gameId);
    game.redLogicLines = [
        { sourceTurnId, sourceMarker, targetTurnId, targetMarker },
        ...game.redLogicLines
    ];
    await game.save();
    res.json({ item: game.redLogicLines[0] })
}

const updateRedLogicLines = async (req, res) => {
    const { gameId } = req.gameInfo;
    const { redLogicLines } = req.body;
    // console.log(redLogicLines);
    const game = await Game.findById(gameId);
    // @fixme
    // if (!game) {
    //     game = new Game({
    //         name: "Dev"
    //     })
    //     await game.save();
    // }
    game.redLogicLines = redLogicLines;
    await game.save();
    res.json({ item: game });    // нейтральное название "item" (payload)
}

const deleteRedLogicLines = async (req, res) => {
    const { gameId } = req.gameInfo;
    const { redLogicLines } = req.body;
    // console.log(redLogicLines);
    const game = await Game.findById(gameId);
    // @todo: O(n^2) заменить на O(n)
    const length = game.redLogicLines.length
    game.redLogicLines = game.redLogicLines.filter(line => {
        for (let redLogicLineToRemove of redLogicLines) {
            if (line._id == redLogicLineToRemove._id) {
                return false;
            }
        }
        return true
    })
    await game.save();

    res.json({
        item: game
    })
}

module.exports = {
    createGame,
    // getItem,
    updateRedLogicLines,
    createRedLogicLine,
    deleteRedLogicLines,
    getGame,
    getGames,
    editGame,
    deleteGame
};











