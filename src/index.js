import Game from './game';

(async () => {
    const game = new Game({
        stageEl: $('#gameBox'),
    });
    await game.init();
})();