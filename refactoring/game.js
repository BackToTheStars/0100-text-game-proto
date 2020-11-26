
import {
    getTurns,
    createTurn,
    updateTurn,
    deleteTurn,
    turnsUpdateCoordinates,
    getRedLogicLines
} from './service';
import {
    TurnCollection,
    LinesCollection,
    QuotesCollection
} from './collections'
import GameField from './gameField'
import ToolsPanel from './toolsPanel'
import { getPopup } from './popup'
import ClassPanel from './classPanel'
import LinesLayer from './linesLayer'


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
        this.linesLayer = new LinesLayer({ stageEl }, this.triggers);
    }
    async init() {
        this.turnCollection = new TurnCollection({
            turnsData: await getTurns(),
            stageEl: this.stageEl,
        }, this.triggers);

        const { item: { redLogicLines } } = await getRedLogicLines();
        this.linesLayer.quotesCollection = new QuotesCollection(this.turnCollection.getTurns(), this.triggers)
        this.linesLayer.linesCollection = new LinesCollection(redLogicLines, {
            getQuote: this.linesLayer.quotesCollection.getQuote
        });
        this.linesLayer.render();

        this.triggers.dispatch = async (type, data) => {
            // добавить логгер действий пользователя - потом её можно использовать в тестах и телеметрии
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
                    this.linesLayer.render();
                    break;
                }
                case 'CREATE_LINE': {
                    // @todo: backend request
                    // добавить в коллекцию линий
                    // отрисовать линии
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
                case 'MAKE_FIELD_TRANSLUCENT': {
                    this.gameField.makeTranslucent(data); // data = true/false
                    break;
                }
                case 'TOGGLE_LINES_FRONT_BACK': {
                    this.linesLayer.toggleLinesZIndex();
                    break;
                }
                case 'CLICKED_QUOTE': {
                    this.linesLayer.setClickedQuote(data)
                    break;
                }
                // lines and markers
                // ACTIVATE_MARKER (DEACTIVATE_MARKER) - click on yellow
                // CONNECT_MARKERS - click on yellow
                // SHOW_MARKERS_PANEL / HIDE_MARKERS_PANEL - click on marker
                // RENDER_LINES
                // TOGGLE_LINES_VISIBILITY - button
                // TOGGLE_LINES_TO_BACK - button

                case 'ZOOM_IN': { break; }        // д.з. какие здесь ещё понадобятся функции?
                case 'EDIT_CLASS': { break; }
                case 'EDIT_SUBCLASS': { break; }
                case 'DELETE_SUBCLASS': { break; }
                case 'FLY_TO_MINIMAP': { break; }
            }
        }
    }
    addEventListeners() {

    }
}

export default Game;
