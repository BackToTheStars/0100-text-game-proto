// предназначен для предоставления доступа к шагам,
// но знает минимум об их реализации

import Turn from './turn';

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
    constructor( lines ) {
        this.lines = lines;
    }
    getLines() {
        return this.lines;
    }
    getLine({ _id }) {
        return this.lines.find((line) => line._id === _id);
    }
    addLine(data) {
        this.lines.push(data);
    }
    updateLine(data) {
        const line = this.getLine({ _id: data._id });
        for(let k in data) {
            line[k] = data[k]
        }
    }
    removeLine({ _id }) {
        const index = this.lines.findIndex(
            (line) => line._id === _id
        );
        this.lines.slice(index, 1);
    }
}

export {
    TurnCollection,
    LinesCollection
};