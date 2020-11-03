const getTurns = (callback) => {
    $.ajax({
        type: 'GET',
        url: '/getTurns',
        data: '',
        success: (data) => {
            callback(
                data.map((item) => ({
                    author_id: '123', // @fixme
                    ...item,
                }))
            );
        },
    });
};

const turnsUpdateCoordinates = (turnObjects, callback) => {
    $.ajax({
        type: 'PUT',
        url: '/turns/coordinates',
        data: JSON.stringify({
            turns: turnObjects,
        }),
        dataType: 'json',
        contentType: 'application/json',
        success: callback,
    });
};

const createTurn = async (turnObj) => {
    return new Promise(async (resolve, reject) => {

        // const data = await fetch('/saveTurn', {
        //     method: 'POST',
        //     headers: {
        //         'content-type': 'application/json',
        //     },
        //     body: JSON.stringify({ turn: turnObj }),
        // });
        // const res = data.json();
        // resolve(res);

        fetch('/saveTurn', {
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
            url: '/updateTurn',
            data: JSON.stringify({
                turn: turnObj,
            }),
            dataType: 'json',
            contentType: 'application/json',
            success: (data) => {
                resolve(data);
            },
            error: (errObj) => {
                console.log(errObj);
                reject('Request error');
            }
        });
    });
};

const deleteTurn = (turnObj, callback) => {
    $.ajax({
        type: 'DELETE',
        url: '/deleteTurn',
        data: JSON.stringify({
            turn: turnObj,
        }),
        dataType: 'json',
        contentType: 'application/json',
        success: callback,
    });
};

const getRedLogicLines = (callback) => {
    $.ajax({
        type: 'GET',
        url: '/game',
        success: function (data) {
            // const { item = {redLogicLines} } = data;
            const redLogicLines = data.item.redLogicLines;
            callback(redLogicLines);
        },
    });
};

const updateRedLogicLines = (redLogicLines, callback) => {
    $.ajax({
        type: 'PUT',
        url: '/game/red-logic-lines',
        data: JSON.stringify({
            redLogicLines,
        }),
        dataType: 'json',
        contentType: 'application/json',
        success: callback,
    });
};

export {
    getTurns,
    turnsUpdateCoordinates,
    createTurn,
    updateTurn,
    deleteTurn,
    getRedLogicLines,
    updateRedLogicLines,
};
