
import { getTurns } from './service';
import { TurnCollection } from './collections'
import GameField from './gameField'
import ToolsPanel from './toolsPanel'
import { getPopup } from './popup'

// настраивает компоненты игры,
// обеспечивает передачу данных между компонентами
class Game {
    constructor({ stageEl }) {
        this.stageEl = stageEl;
        this.triggers = {}
        this.gameField = new GameField({
            stageEl: this.stageEl,
        }, this.triggers);
        this.toolsPanel = new ToolsPanel({},this.triggers)
        this.popup = getPopup(document.body, {})
    }
    async init() {
        this.turnCollection = new TurnCollection({
            turnsData: await getTurns(),
            stageEl: this.stageEl,
        }, this.triggers);
        this.triggers.dispatch = (type, data) => {
            switch (type) {  
                case 'RECALCULATE_FIELD': {
                    this.gameField.recalculate(this.turnCollection.getTurns())
                    break;
                }                             
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
                    if(data) {
                        // обновление
                    } else {
                        // открытие попапа
                        this.popup.openModal();
                    }
                    break;
                }
                case 'ZOOM'                : { break; }        // д.з. какие здесь ещё понадобятся функции?
                case 'MANAGE_CLASS'        : { break; }
                case 'MANAGE_SUBCLASS'     : { break; }
                case 'FLY_TO_MINIMAP'      : { break; }
                // ADD_LINE
                // TOGGLE_LINES
                // *LINE

                // SAVE_POSITIONS
            }
        }
    }
    addEventListeners() {

    }
}

export default Game;
