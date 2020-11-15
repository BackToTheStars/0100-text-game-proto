
/* <div class="col-2 p0 hidden" id="classMenu">
    <div class="col-12">
        <span class="prompt">Add new class:</span>
        <input id="newClassName" />
        <button id="add-new-class">Add</button>
    </div>
</div> */

class ClassPanel {
    constructor(params, triggers) {
        this.el = $('#classMenu');
        this.triggers = triggers;

        this.addClassBtn = this.el.find('#add-new-class');
        this.classNameInput = this.el.find('#newClassName');

        this.addEventHandlers();
    }

    addEventHandlers() {
        this.addClassBtn.click(() => {
            this.triggers.dispatch("ADD_GAME_CLASS", { name: this.classNameInput.value });
            this.classNameInput.value = '';
        });
    };

    togglePanelVisibility() {
        this.el.toggleClass('hidden');
    };
}

export default ClassPanel;