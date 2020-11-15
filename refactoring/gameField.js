
class GameField {

    constructor({ stageEl }, triggers) {
        this.stageEl = stageEl;
        this.triggers = triggers;

        this.addEventHandlers();
    }

    saveFieldSettings(settings) {
        // left, top,
        // width, height
        localStorage.setItem('gameField', JSON.stringify(settings));
    };

    // проверить необходимость
    getFieldSettings() {
        const settings = JSON.parse(localStorage.getItem('gameField')) || {
            left: 0,
            top: 0,
            width: 1000,
            height: 1000,
        };
        return settings;
    };

    // двигаем поле в одну сторону, а все шаги в противоположную
    recalculate(turns) {
        // найти textboxes
        // const textBoxElements = document.querySelectorAll('.textBox');
        // пересчитать настройки
        for (let turn of turns) {
            turn.moveEl(parseInt(this.stageEl.css('left')), parseInt(this.stageEl.css('top')))
        }
        this.stageEl.css('left', 0)
        this.stageEl.css('top', 0)
        this.saveFieldSettings({
            left: 0,
            top: 0,
        });
    };

    saveTurnPositions(turns) {
        // функция сохранения поля
        const payload = [];
        for (let turn of turns) {
            const {
                x, y, height, width, id, contentType, scrollPosition
            } = turn.getPositionInfo();
            payload.push({ x, y, height, width, id, contentType, scrollPosition });
        }
        return payload;
    }

    addEventHandlers() {
        this.stageEl.draggable({
            stop: (event, ui) => {
                this.saveFieldSettings({
                    left: ui.position.left,
                    top: ui.position.top,
                    height: 1000,
                    width: 1000,
                });
                // game.recalculate();
                this.triggers.dispatch('RECALCULATE_FIELD');
                this.triggers.dispatch('DRAW_LINES');
            },
        });

    };
}

export default GameField;