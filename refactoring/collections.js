import Turn from './turn';

// предназначен для предоставления доступа к шагам,
// но знает минимум об их реализации
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

export {
    TurnCollection
};