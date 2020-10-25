import { quill, getQuillTextArr } from './quillHandler';
import { getInputValue, makeNewBoxMessage } from './script';
import { updateTurn } from './service';

const getPopup = () => {
  let el = document.createElement('div');

  // draw modal window
  const drawModalWindow = () => {
    el.setAttribute('id','modalBackground');
    el.innerHTML = `<div id="modal" class="container">
    <div class="row my-4">
        <div class="col-4">
            <div class="my-4">
                <input type="text" class="form-control" id="headerInput" />
            </div>
            <div class="my-4">
                <input type="date" class="form-control" id="dateInput" />
            </div>
            <div class="my-4">
                <input type="text" class="form-control" id="sourceUrlInput" />
            </div>
        </div>
        <div class="col-4">
            <div class="my-4">
                <input type="text" class="form-control" id="imageUrlInput" style="display:none;" />
            </div>
            <div class="my-4">
                <input type="text" class="form-control" id="videoUrlInput" style="display:none;" />
            </div>
        </div>
    </div>
    <div class="row my-4">
        <div class="col">
            <div id="toolbar-container">
                <span class="ql-formats">
                    <select class="ql-background">
                        <option selected></option>
                        <option value="yellow"></option>
                    </select>
                </span>
            </div>
            <div id="editor-container"></div>
            <!-- class="h-85"> -->
        </div>
    </div>
    <div class="row mb-4">
        <div class="col">
            <button id="modalSaveButton">Save</button>
            <button id="cancel-turn-modal">Close</button>
        </div>
    </div>
    </div>`
  }

  // change type

  const openModal = () => {

  }

  return {
    openModal
  }
}

export {
  getPopup
}






