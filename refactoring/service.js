const getTurns = async () =>
    new Promise((resolve, reject) => {
        $.ajax({
            type: 'GET',
            url: '/getTurns',
            success: resolve,
            error: reject
        });
    });

const turnsUpdateCoordinates = async (turns) =>
    new Promise((resolve,reject) => {
        $.ajax({
            type: 'PUT',
            url: '/turns/coordinates',
            data: JSON.stringify({
                turns,
            }),
            dataType: 'json',
            contentType: 'application/json',
            success: resolve,
            error: reject
        });
    });

export { getTurns, turnsUpdateCoordinates };

