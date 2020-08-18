function getTurns(callback) {
    $.ajax({
        type: "GET",
        url: "/getTurns",
        data: "",
        success: callback,
    });
}

function saveTurn(turnObj, callback) {
    $.ajax({
        type: "POST",
        url: "/saveTurn",
        data: JSON.stringify({
            turn: turnObj,
        }),
        dataType: "json",
        contentType: "application/json",
        success: callback,
    });
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
