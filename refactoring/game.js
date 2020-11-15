
import {
    getTurns,
    createTurn,
    updateTurn,
    deleteTurn,
    turnsUpdateCoordinates
} from './service';
import { TurnCollection } from './collections'
import GameField from './gameField'
import ToolsPanel from './toolsPanel'
import { getPopup } from './popup'
import ClassPanel from './classPanel'

// настраивает компоненты игры,
// обеспечивает передачу данных между компонентами
class Game {
    constructor({ stageEl }) {
        this.stageEl = stageEl;
        this.triggers = {}
        this.gameField = new GameField({
            stageEl: this.stageEl,
        }, this.triggers);
        this.toolsPanel = new ToolsPanel({}, this.triggers);
        this.classPanel = new ClassPanel({}, this.triggers);
        this.popup = getPopup(document.body, this.triggers);
    }
    async init() {
        this.turnCollection = new TurnCollection({
            turnsData: await getTurns(),
            stageEl: this.stageEl,
        }, this.triggers);
        this.triggers.dispatch = async (type, data) => {
            switch (type) {
                case 'SAVE_FIELD_POSITION': {
                    const turns = await this.turnCollection.getTurns();
                    const payload = this.gameField.saveTurnPositions(turns);
                    await turnsUpdateCoordinates(payload);
                    console.log('Positions of all turns re-saved.');
                    break;
                }
                case 'RECALCULATE_FIELD': {      // двигает все ходы при отпускании draggable() поля
                    const turns = await this.turnCollection.getTurns();
                    this.gameField.recalculate(turns)
                    break;
                }
                case 'DRAW_LINES': {
                    console.log('DRAW_LINES')
                    break;
                }
                case 'CREATE_TURN': {
                    createTurn(data).then(res => {
                        console.log(res);
                        this.turnCollection.addTurn(res)
                    });
                    break;
                }
                case 'SAVE_TURN': {
                    this.turnCollection.updateTurn(data);
                    this.turnCollection.getTurn(data).update();
                    updateTurn(data);
                    break;
                }
                case 'REMOVE_TURN': {
                    this.turnCollection.getTurn(data).destroy();
                    this.turnCollection.removeTurn(data);
                    deleteTurn(data);
                    break;
                }
                case 'OPEN_POPUP': {
                    if (data) {
                        // обновление
                        this.popup.openModal();
                        this.popup.setTurn(data);      // подставляет данные в модальное окно
                    } else {
                        // открытие попапа
                        this.popup.openModal();
                    }
                    break;
                }
                case 'TOGGLE_CLASS_PANEL': {
                    this.classPanel.togglePanelVisibility();
                    break;
                }

                case 'ZOOM': { break; }        // д.з. какие здесь ещё понадобятся функции?
                case 'MANAGE_CLASS': { break; }
                case 'MANAGE_SUBCLASS': { break; }
                case 'FLY_TO_MINIMAP': { break; }
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
