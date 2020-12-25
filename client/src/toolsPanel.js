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

    this.addTurnBtn = this.el.find('#add-new-box-to-game-btn');
    this.toggleLeftPanelBtn = this.el.find('#toggle-left-panel');
    this.savePositionsBtn = this.el.find('#save-positions-btn');
    this.showMinimapBtn = this.el.find('#show-minimap-btn')
    this.addEventHandlers();
  }
  
  addEventHandlers() {
    this.addTurnBtn.click(() => this.triggers.dispatch("OPEN_POPUP"));
    this.toggleLeftPanelBtn.click(() => this.triggers.dispatch("TOGGLE_CLASS_PANEL"));
    this.savePositionsBtn.click(() => this.triggers.dispatch("SAVE_FIELD_POSITION"));
    this.showMinimapBtn.click(() => this.triggers.dispatch("TOGGLE_MINIMAP"));
  }
}

export default ToolsPanel