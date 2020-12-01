// data-sourceTurnId="${el.sourceTurnId}"
// data-sourceMarker="${el.sourceMarker}"
// data-targetTurnId="${el.targetTurnId}"
// data-targetMarker="${el.targetMarker}"

class QuotesPanel {
    constructor(params, triggers) {
        this.el = $('.quotes-panel');
        this.triggers = triggers;
        this.lines = [];
        this.el.hide('fast');
        this.addEventHandlers();
    }

    show(data) {
        const { lines, quote } = data;
        this.lines = lines;
        this.el.html(lines.length ? `<table>
          <thead>
              <tr><th>from</th><th>to</th><th>actions</th></tr>
          </thead>
          <tbody>
              ${lines
                .map((line, index) => {
                  return `
                    <tr data-index="${index}">
                        <td>${line.sourceQuote.el.text().trim()}</td>
                        <td>${line.targetQuote.el.text().trim()}</td>
                        <td>
                            <button class="del-btn">Delete</button>
                        </td>
                    </tr>`;
                })
                .join('')}
          </tbody>
        </table>` : '');
        this.el.show('fast');
    }
    addEventHandlers() {
      const me = this;
      this.el.on('click','.del-btn', function() {
        const index = parseInt($(this).parents('tr').attr('data-index'));
        // console.log(me.lines[index]);
        me.triggers.dispatch('DELETE_LINE', {
          line: me.lines[index]
        });
      })
      // this.el.find('.del-btn').click((e) => {});
    
        // DOM
        // this.el.get(0).querySelectorAll('.del-btn')
    }
    removeEventHandlers() {

    }
    hide() {
      this.el.hide('fast');
      this.lines = [];
      this.removeEventHandlers();
    }
}

export default QuotesPanel