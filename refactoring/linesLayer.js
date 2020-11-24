import { LinesCollection, QuotesCollection } from './collections'
import Quote from './quote';
import Line from './line';

class LinesLayer {
    constructor({ stageEl }, triggers) {
        this.stageEl = stageEl;
        this.quotesCollection = new QuotesCollection([]);
        this.linesCollection = new LinesCollection([], {
            getQuote: this.quotesCollection.getQuote
        });

        this.el = $(`<svg viewBox="0 0 ${this.stageEl.width()} ${this.stageEl
            .height()}" xmlns="http://www.w3.org/2000/svg" id="lines" class="front-elements"></svg>`);

        this.stageEl.append(this.el)

        this.el.get(0).addEventListener('dblclick', this.toggleLinesZIndex.bind(this)); // потому что JQuery элемент 

        this.activeQuote = null;
        this.activeLines = [];
    }

    setClickedQuote({turnId, num}) {
        const quote = this.quotesCollection.getQuote(turnId, num);
        // @todo: более сложная логика
        console.log(quote);
    }

    render() {
        let linesStr = '';
        for (let lineObj of this.linesCollection.getLines()) {
            if (!lineObj.isVisible()) {
                continue;
            }
            linesStr += lineObj.getSvgLine();
        }
        this.el.html(linesStr);
    }

    toggleLinesZIndex() {
        this.el.toggleClass('front-elements');
    };


}

export default LinesLayer;
export { Quote, Line }






