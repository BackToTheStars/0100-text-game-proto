class Quote {
    constructor({ el, turn, index }, triggers) {
        this.el = el;
        this.turn = turn;
        this.triggers = triggers;
        // порядковый номер
        this.index = index;
        this.data = {
            turnId: turn._id,
            index
        }
        // координаты
        this.addEventHandlers();
    }
    isVisible() {
        if (!this.el.length) {
            // console.log('Попытка обратиться к несуществующему jquery элементу'); @todo
            return false;
        }
        this.top = this.el.position()['top'];
        this.height = this.el.height();

        if (this.top + this.height < this.turn.getTopHeight()) {
            return false;
        }
        if (this.top > this.turn.getBottomHeight()) {
            return false;
        }
        return true;
    }
    isEqual(quote) {
        return (quote.index === this.index) && (this.turn._id === quote.turn._id);
    }
    addBorder() {
        this.el.addClass('red-border-to-quote');
    }
    removeBorder() {
        this.el.removeClass('red-border-to-quote');
    }
    getCoords() {
        return {
            left: this.el.offset()['left'],
            top: this.el.offset()['top'],
            width: this.el.width(),
            height: this.el.height(),
        };
    }
    addEventHandlers() {
        // click - красная рамка
        this.el.get(0).addEventListener('click', () => {
            // console.log(this.data);
            this.triggers.dispatch('CLICKED_QUOTE', this.data)
        })
    }
}

module.exports = Quote