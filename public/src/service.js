function getTurns(callback) {
    $.ajax({
        type: "GET",
        url: "/getTurns",
        data: "",
        success: callback,
    });
}

function saveTurn(turnObj, callback) {
    fetch('/saveTurn', {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({turn: turnObj})
    })
    .then(it => {callback(it)})
    .catch(err=> {console.log(err.stack)});
        
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
}

function turnsUpdateCoordinates(turnObjects, callback) {
    $.ajax({
        type: "PUT",
        url: "/turns/coordinates",
        data: JSON.stringify({
            turns: turnObjects,
        }),
        dataType: "json",
        contentType: "application/json",
        success: callback,
    });
}

function updateTurn(turnObj, callback) {
    $.ajax({
        type: "POST",
        url: "/updateTurn",
        data: JSON.stringify({
            turn: turnObj,
        }),
        dataType: "json",
        contentType: "application/json",
        success: callback,
    });
}

function deleteTurn(turnObj, callback) {
    $.ajax({
        type: "DELETE",
        url: "/deleteTurn",
        data: JSON.stringify({
            turn: turnObj,
        }),
        dataType: "json",
        contentType: "application/json",
        success: callback,
    });
}
