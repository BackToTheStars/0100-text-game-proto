import Game from './game';
import { } from './script';

(async () => {
    const game = new Game({
        stageEl: $('#gameBox'),
    });
    await game.init();
})();