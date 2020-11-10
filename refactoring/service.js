const getTurns = async () =>
    new Promise((resolve, reject) => {
        $.ajax({
            type: 'GET',
            url: '/getTurns',
            success: resolve,
            error: reject,
        });
    });

export { getTurns };