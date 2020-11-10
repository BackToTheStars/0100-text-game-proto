
import { getTurns } from './service';
import { TurnCollection } from './collections'

// настраивает компоненты игры,
// обеспечивает передачу данных между компонентами
class Game {
    constructor({ stageEl }) {
        this.stageEl = stageEl;
        this.triggers = {}
    }
    async init() {
        this.turnCollection = new TurnCollection({
            turnsData: await getTurns(),
            stageEl: this.stageEl,
        }, this.triggers);
        this.triggers.dispatch = (type, data) => {
            switch (type) {                               
                case 'DRAW_LINES': {
                    console.log('DRAW_LINES')
                    break;
                }
                case 'REMOVE_TURN': {
                    this.turnCollection.getTurn(data).destroy();
                    // @todo: backend request
                    this.turnCollection.removeTurn(data);
                    break;
                }
                case 'OPEN_POPUP': {
                    alert("OPEN_POPUP")
                    console.log(data);
                    break;
                }
                case 'ZOOM'                : { break; }        // д.з. какие здесь ещё понадобятся функции?
                case 'MANAGE_CLASS'        : { break; }
                case 'MANAGE_SUBCLASS'     : { break; }
                case 'FLY_TO_MINIMAP'      : { break; }
            }
        }
    }
}

export default Game;
