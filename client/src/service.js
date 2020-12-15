let API_URL = 'http://localhost:3000'
if((typeof process !== 'undefined') && process.env.API_URL) {
    API_URL = process.env.API_URL
}
const getTurns = async () =>
    new Promise((resolve, reject) => {
        $.ajax({
            type: 'GET',
            url: `${API_URL}/getTurns`,
            success: resolve,
            error: reject
        });
    });

const createTurn = async (turnObj) => {
    return new Promise(async (resolve, reject) => {
        fetch(`${API_URL}/saveTurn`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({ turn: turnObj }),
        }).then((data) => {
            // @todo: Проверить, не нужен ли data.json()
            return data.json();
        }).then(res => {
            resolve(res);
        })
            .catch((err) => {
                console.log(err);
                reject('Request error');
            });

    })
};

const updateTurn = async (turnObj) => {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: `${API_URL}/updateTurn`,
            data: JSON.stringify({
                turn: turnObj,
            }),
            dataType: 'json',
            contentType: 'application/json',
            success: resolve,
            error: reject
        });
    });
};

const deleteTurn = async (turnObj) => {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'DELETE',
            url: `${API_URL}/deleteTurn`,
            data: JSON.stringify({
                turn: turnObj,
            }),
            dataType: 'json',
            contentType: 'application/json',
            success: resolve,
            error: reject
        });
    })
};

const turnsUpdateCoordinates = async (turns) =>
    new Promise((resolve, reject) => {
        $.ajax({
            type: 'PUT',
            url: `${API_URL}/turns/coordinates`,
            data: JSON.stringify({
                turns,
            }),
            dataType: 'json',
            contentType: 'application/json',
            success: resolve,
            error: reject
        });
    });


const getRedLogicLines = async () =>
    new Promise((resolve, reject) => {
        $.ajax({
            type: 'GET',
            url: `${API_URL}/game`,
            success: resolve,
            error: reject
        });
    });

const updateRedLogicLines = async (redLogicLines) => 
    new Promise((resolve, reject) => {
        $.ajax({
            type: 'PUT',
            url: `${API_URL}/game/red-logic-lines`,
            data: JSON.stringify({
                redLogicLines,
            }),
            dataType: 'json',
            contentType: 'application/json',
            success: resolve,
            error: reject
        });
    });

const createRedLogicLine = async (line) => 
    new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: `${API_URL}/game/red-logic-lines`,
            data: JSON.stringify(line),
            dataType: 'json',
            contentType: 'application/json',
            success: resolve,
            error: reject
        });
    });

const deleteLines = async (redLogicLines) => {
    new Promise((resolve, reject) => {
        $.ajax({
            type: 'DELETE',
            url: `${API_URL}/game/red-logic-lines`,
            data: JSON.stringify({
                redLogicLines,
            }),
            dataType: 'json',
            contentType: 'application/json',
            success: resolve,
            error: reject
        });
    });
}

export {
    getTurns,
    createTurn,
    updateTurn,
    deleteTurn,
    turnsUpdateCoordinates,
    getRedLogicLines,
    updateRedLogicLines,
    createRedLogicLine,
    deleteLines
};

