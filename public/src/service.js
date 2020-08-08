function getTurns(callback) {
    $.ajax({
        type: "GET",
        url: "/getTurns",
        data: "",
        success: callback
    })
}

function saveTurn(turnObj, callback) {
    $.ajax({
        type: "POST",
        url: "/saveTurn",
        data: JSON.stringify({
            turn: turnObj
        }),
        dataType: "json",
        contentType: "application/json",
        success: callback
    })
}