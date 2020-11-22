// предназначен для предоставления доступа к шагам,
// но знает минимум об их реализации

import Turn from './turn';
import {Quote,Line} from './linesLayer';

class TurnCollection {
    constructor({ turnsData, stageEl }, triggers) {
        this.stageEl = stageEl;
        this.triggers = triggers;
        this.turnObjects = turnsData.map((data) => new Turn({ data, stageEl }, triggers));
    }
    getTurns() {
        return this.turnObjects;
    }
    getTurn({ _id }) {
        return this.turnObjects.find((turnObject) => turnObject._id === _id);
    }
    addTurn(data) {
        this.turnObjects.push(new Turn({ data, stageEl: this.stageEl }, this.triggers));
    }
    updateTurn(data) {
        const turnObject = this.getTurn({ _id: data._id });
        turnObject.setData(data);
    }
    removeTurn({ _id }) {
        const index = this.turnObjects.findIndex(
            (turnObject) => turnObject._id === _id
        );
        this.turnObjects.slice(index, 1);
    }
}

class LinesCollection {
    constructor( lines, {getQuote} ) {
        this.getQuote = getQuote;
        this.lines = lines.map(data => new Line(data, {getQuote}));
    }
    getLines() {
        return this.lines;
    }
    getLine({ _id }) {
        return this.lines.find((line) => line._id === _id);
    }
    addLine(data) {
        this.lines.push(new Line(data, {getQuote: this.getQuote}));
    }
    removeLine({ _id }) {
        const index = this.lines.findIndex(
            (line) => line._id === _id
        );
        this.lines.slice(index, 1);
    }
}

class QuotesCollection {
    constructor(turnObjects) {
        this.turnObjects = turnObjects;
        this.quoteObjects = [];
        for(let turnObject of turnObjects) {
            const quoteElements = turnObject.getQuoteElements();
            // for(let index=0; index<quoteElements.length; index++)
            for(let [index, quoteElement] of quoteElements.entries()) {
                this.quoteObjects.push(new Quote({
                    el: $(quoteElement),
                    turn: turnObject,
                    index
                }))
            }
        }
        this.getQuote = this.getQuote.bind(this);
    }

    getQuote(turnId, num) { // @todo: change to get by id
        return this.quoteObjects.find((quoteObject) =>
            (quoteObject.turn._id == turnId && num == quoteObject.index));
    }
}

export {
    TurnCollection,
    LinesCollection,
    QuotesCollection
};