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

const saveTurn = (turnObj, callback) => {
    fetch('/saveTurn', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({ turn: turnObj }),
    })
        .then((it) => {
            callback(it);
        })
        .catch((err) => {
            console.log(err.stack);
        });

    // $.ajax({
    //     type: "POST",
    //     url: "/saveTurn",
    //     data: JSON.stringify({
    //         turn: turnObj,
    //     }),
    //     dataType: "json",
    //     contentType: "application/json",
    //     success: callback,
    // });
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

const updateTurn = (turnObj, callback) => {
    $.ajax({
        type: 'POST',
        url: '/updateTurn',
        data: JSON.stringify({
            turn: turnObj,
        }),
        dataType: 'json',
        contentType: 'application/json',
        success: callback,
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
    saveTurn,
    turnsUpdateCoordinates,
    updateTurn,
    deleteTurn,
    getRedLogicLines,
    updateRedLogicLines,
};
