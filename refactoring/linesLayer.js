import {
  LinesCollection
} from './collections'

class LinesLayer {
    constructor({stageEl}, triggers) {
      this.stageEl = stageEl;
      this.linesCollection = new LinesCollection([]);

      this.el = $(`<svg viewBox="0 0 ${this.stageEl.width()} ${this.stageEl
      .height()}" xmlns="http://www.w3.org/2000/svg" id="lines"></svg>`);

      this.stageEl.append(this.el)
    }

    render() {
      let linesStr = '';
      // @todo collect lines
      console.log('collection', this.linesCollection)

      this.el.innerHTML = linesStr;
    }
}

export default LinesLayer;













