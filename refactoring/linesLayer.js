import {
    LinesCollection,
    QuotesCollection
} from './collections'


let linkLineWidth = 2;

function isMarkerVisible(jqElement) {
    // элементы отбрасывают "тень", иметь ввиду для дальнейших видов контента!
    // if(jqElement.parents('[data-content-type="picture"]').length) {
    //     debugger;
    // }
    if (!jqElement.length) {
        // console.log('Попытка обратиться к несуществующему jquery элементу'); @todo
        return false;
    }
    const top = jqElement.position()['top'];
    const height = jqElement.height();
    const paragraphHeight = jqElement.parents('.paragraphText').height();
    const headerHeight =
        jqElement.parents('.textBox').find('.headerText').height() || 0;
    const pictureHeight =
        jqElement.parents('.textBox').find('.picture-content').height() || 0;
    const iFrameHeight =
        jqElement.parents('.textBox').find('.video').height() || 0;

    if (top + height < headerHeight + pictureHeight + iFrameHeight) {
        return false;
    }
    if (top > headerHeight + paragraphHeight + pictureHeight + iFrameHeight) {
        return false;
    }
    return true;
}

const getLine = (gameBox, x1, y1, x2, y2) => {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="red" stroke-width="${linkLineWidth}" />`;
};

const getMarkerCoords = (turnId, markerPos) => {
    // берём координаты жёлтых цитат
    const element = $(`[data-id = "${turnId}"]`);
    const markerEls = element
        .find('.paragraphText span')
        .toArray()
        .filter((spanEl) => {
            return $(spanEl).css('background-color') === 'rgb(255, 255, 0)';
        });
    return {
        left: $(markerEls[markerPos]).offset()['left'],
        top: $(markerEls[markerPos]).offset()['top'],
        width: $(markerEls[markerPos]).width(),
        height: $(markerEls[markerPos]).height(),
    };
};

const getYellowElements = (turnId) => {
    const element = $(`[data-id = "${turnId}"]`);
    return element
        .find('.paragraphText span')
        .toArray()
        .filter((spanEl) => {
            return $(spanEl).css('background-color') === 'rgb(255, 255, 0)';
        });
};

const getYellowElement = (turnId, markerId) => {
    const elements = getYellowElements(turnId);
    return elements[markerId];
};

class Quote {
    constructor({ el, turn }) {
        this.el = el;
        this.turn = turn;
        // порядковый номер
        // координаты
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
    addEventHandlers() {
        // click - красная рамка
    }
}


class LinesLayer {
    constructor({ stageEl }, triggers) {
        this.stageEl = stageEl;
        this.linesCollection = new LinesCollection([]);
        this.quotesCollection = new QuotesCollection([]);

        this.el = $(`<svg viewBox="0 0 ${this.stageEl.width()} ${this.stageEl
            .height()}" xmlns="http://www.w3.org/2000/svg" id="lines"></svg>`);

        this.stageEl.append(this.el)
    }

    render() {
        let linesStr = '';
        // @todo collect lines
        console.log('collection', this.linesCollection)
        // this.quotesCollection
        for (let lineInfo of this.linesCollection.getLines()) {

            const sourceMarkerEl = getYellowElement(
                lineInfo.sourceTurnId,
                lineInfo.sourceMarker
            );
            if (!isMarkerVisible($(sourceMarkerEl))) {
                continue;        // перескакивает на следующую итерацию for
            }

            // if (!this.quotesCollection.getQuote(lineInfo.sourceTurnId, lineInfo.sourceMarker).isVisible()) {
            //     continue
            // }

            const targetMarkerEl = getYellowElement(
                lineInfo.targetTurnId,
                lineInfo.targetMarker
            );
            if (!isMarkerVisible($(targetMarkerEl))) {
                continue;
            }

            const sourceCoords = getMarkerCoords(
                lineInfo.sourceTurnId,
                lineInfo.sourceMarker
            );
            const targetCoords = getMarkerCoords(
                lineInfo.targetTurnId,
                lineInfo.targetMarker
            );
            const sideBarWidth = $('#classMenu').width(); // + 45;

            // фрагмент 3

            const sourceFirst = sourceCoords.left < targetCoords.left;
            const line = {
                x1:
                    sourceCoords.left +
                    (sourceFirst ? sourceCoords.width : 0) -
                    sideBarWidth +
                    (sourceFirst ? 6 : -6), // + 3,
                y1: sourceCoords.top + Math.floor(sourceCoords.height / 2),
                x2:
                    targetCoords.left +
                    (sourceFirst ? 0 : targetCoords.width) -
                    sideBarWidth +
                    (sourceFirst ? -2 : 2), // - 5,
                y2: targetCoords.top + Math.floor(targetCoords.height / 2),
            };
            // отрисовка координат @todo: сделать ifNeedToRender()
            linesStr += getLine(gameBox, line.x1, line.y1, line.x2, line.y2);
        }
        // if ($('#lines').length) {
        //     $('#lines').remove();
        // }

        this.el.html(linesStr);
    }
}

export default LinesLayer;













