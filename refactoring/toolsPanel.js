/*
<div class="actions"></div>
<!-- Фрагменты 5 и 6 -->
<button id="add-new-box-to-game-btn">Add Turn</button>
<button id="save-positions-btn">Save Field</button>
<button id="zoom-plus-btn"> + </button>
<button id="zoom-minus-btn"> - </button>
<button id="toggle-links-btn">Toggle Links</button>
<button id="move-scroll-btn">Move/Scroll</button>
<button id="toggle-left-panel">Left Panel</button>
</div>
*/
class ToolsPanel {
  constructor(params, triggers) {
    this.el = $('.actions');
    this.triggers = triggers;

    this.addTurnBtn = this.el.find('#add-new-box-to-game-btn')
    this.addEventHandlers();
  }
  
  addEventHandlers() {
    this.addTurnBtn.click(() => this.triggers.dispatch("OPEN_POPUP"));
  }
}

export default ToolsPanel