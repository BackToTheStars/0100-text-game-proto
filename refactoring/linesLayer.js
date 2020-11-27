import { LinesCollection, QuotesCollection } from './collections'
import Quote from './quote';
import Line from './line';

class LinesLayer {
    constructor({ stageEl, quotesPanel }, triggers) {
        this.triggers = triggers;
        this.stageEl = stageEl;
        this.quotesPanel = quotesPanel;
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

    setClickedQuote({ turnId, num }) { // ПРОВЕРКИ, ЧТО ДАЛЬШЕ ДЕЛАТЬ С КЛИКНУТОЙ ЦИТАТОЙ
        const quote = this.quotesCollection.getQuote(turnId, num);
        if (this.activeQuote) { // активная цитата уже была
            if (quote.isEqual(this.activeQuote)) { // нажата та же цитата, что и раньше
                this.activeQuote = null;
                const line = this.linesCollection.getLines().find(line => line.hasQuote(quote))
                // проверить, есть ли связи у цитаты
                // если нет, то убрать рамочку
                if (!line) {
                    quote.removeBorder();
                } 
                this.quotesPanel.hide();      // скрыть panel редактирования линий 
            } else { // нажата новая цитата
                const line = this.linesCollection.getLineByQuotes(
                    quote,
                    this.activeQuote
                );
                if (!line) { // если линии, соединяющей две цитаты, ещё нет
                    this.triggers.dispatch('CREATE_LINE', {
                        sourceQuote: this.activeQuote,
                        targetQuote: quote
                    });
                }
                this.activeQuote = quote;
                // дождаться создания линии
                // @todo: перерисовать панель редактирования линий на новую цитату
                this.quotesPanel.show({
                    quote: this.activeQuote,
                    lines: this.linesCollection.getLinesByQuote(this.activeQuote)
                })
            }
        } else { // активной цитаты ещё не было
            this.activeQuote = quote;
            // @todo: перерисовать панель редактирования линий на активную цитату
            this.quotesPanel.show({
                quote: this.activeQuote,
                lines: this.linesCollection.getLinesByQuote(this.activeQuote)
            })
            // рисуем рамку вокруг активной цитаты
            quote.addBorder();
        }
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






