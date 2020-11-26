class Line {
  constructor(data, { getQuote }) {
      this.sourceQuote = getQuote(
          data.sourceTurnId,
          data.sourceMarker
      );
      this.targetQuote = getQuote(
          data.targetTurnId,
          data.targetMarker
      );
      this.sourceQuote && this.sourceQuote.addBorder()  
      this.targetQuote && this.targetQuote.addBorder() 
  }
  isVisible() {
      if (!this.sourceQuote || !this.targetQuote) {
          // @fixme
          return false;
      }
      return this.sourceQuote.isVisible() && this.targetQuote.isVisible();
  }
  hasQuote(quote) {
    return this.sourceQuote.isEqual(quote) || this.targetQuote.isEqual(quote)
  }
  getSvgLine() {
      const sourceCoords = this.sourceQuote.getCoords();
      const targetCoords = this.targetQuote.getCoords();
      const sideBarWidth = 0; // @todo: change the layout
      // $('#classMenu').width(); // + 45;

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

      const k = 0.5
      // line.x1 + k * (line.x2 - line.x1)
      // line.y1 + k * (line.y2 - line.y1)

      return `<path 
          d="M${line.x1} ${line.y1} C ${line.x1 + k * (line.x2 - line.x1)} ${line.y1}, ${line.x2 - k * (line.x2 - line.x1)} ${line.y2}, ${line.x2} ${line.y2}"
          stroke="red" stroke-width="3" fill="transparent"
      />`
      // return `<line x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}" stroke="red" stroke-width="2" />`;
  }
}

module.exports = Line;