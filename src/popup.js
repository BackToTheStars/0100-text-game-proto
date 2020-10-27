
// УНИВЕРСАЛЬНОЕ ОКНО СОЗДАНИЯ И РЕДАКТИРОВАНИЯ ХОДА

import { getQuill } from './quillHandler';
import { getInputValue, makeNewBoxMessage } from './script';
import { createTurn, updateTurn } from './service';

let popup = null;
const createPopup = (inputDiv) => {

    // переменные и инициализация (constructor)
    let el = document.createElement('div');
    drawModalWindow();
    const closeBtn = el.querySelector('#cancel-turn-modal');
    const saveBtn = el.querySelector('#save-turn-modal')

    const headerInput = el.querySelector('#headerInput')
    const dateInput = el.querySelector('#dateInput')
    const sourceUrlInput = el.querySelector('#sourceUrlInput')
    const imageUrlInput = el.querySelector('#imageUrlInput')
    const videoUrlInput = el.querySelector('#videoUrlInput')
    const idInput = el.querySelector('#idInput')
    const { quill, getQuillTextArr } = getQuill('#editor-container', '#toolbar-container');
    // применение Quill к divs

    // draw modal window
    function drawModalWindow() {
        el.setAttribute('id', 'modalBackground');
        el.innerHTML = `<div id="modal" class="container">
        <div class="row my-4">
            <div class="col-8">
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
        <div class="col-4">
            <input type="hidden" id="idInput" />
            <div class="form-group row">
                <label class="col-sm-4 col-form-label">Header</label>
                <div class="col-sm-8">
                    <input type="text" class="form-control" id="headerInput">
                </div>
            </div>
            <div class="form-group row">
                <label class="col-sm-4 col-form-label">Date</label>
                <div class="col-sm-8">
                    <input type="date" class="form-control" id="dateInput">
                </div>
            </div>
            <div class="form-group row">
                <label class="col-sm-4 col-form-label">Source Url</label>
                <div class="col-sm-8">
                    <input type="text" class="form-control" id="sourceUrlInput">
                </div>
            </div>
            <div class="form-group row">
                <label class="col-sm-4 col-form-label">Image Url</label>
                <div class="col-sm-8">
                    <input type="text" class="form-control" id="imageUrlInput" style="display:none;">
                </div>
            </div>
            <div class="form-group row">
                <label class="col-sm-4 col-form-label">Video Url</label>
                <div class="col-sm-8">
                    <input type="text" class="form-control" id="videoUrlInput" style="display:none;">
                </div>
            </div>
        </div>

    </div>
    <div class="row mb-4">
        <div class="col">
            <button id="save-turn-modal">Save</button>
            <button id="cancel-turn-modal">Close</button>
        </div>
    </div>
    </div>`

        inputDiv.appendChild(el);
    }

    /* ФУНКЦИИ И МЕТОДЫ */
    // change type
    const showError = msg => {
        console.log(msg);
    }

    const saveModal = async () => {
        let textArr = getQuillTextArr();
        let id = el.querySelector('#idInput').value;
        let header = el.querySelector('#headerInput').value;
        let date = el.querySelector('#dateInput').value;
        let sourceUrl = el.querySelector('#sourceUrlInput').value;
        let imageUrl = el.querySelector('#imageUrlInput').value;
        let videoUrl = el.querySelector('#videoUrlInput').value;
        let turnObj = {
            header,
            date,
            sourceUrl,
            imageUrl: imageUrl || null,
            videoUrl: videoUrl || null,
            paragraph: textArr,
            _id: id || null,
        };

        let data = null;
        try {
            if(id) {
                data = await updateTurn(turnObj);
                // @todo: передать data существующему turn для обновления
            } else {
                turnObj = {
                    contentType: 'article', // @todo: получить из выпадающего списка
                    height: 500,
                    width: 500,
                    x: 50,
                    y: 50,
                    ...turnObj
                }
                
                data = await createTurn(turnObj);
                // @todo: передать data для создания нового turn на странице
            }
        } catch (error) {
            return showError(error);
        }
        
        // const element = document.querySelector(`[data-id = "${data._id}"]`);
        // element.remove();
        // const newElement = makeNewBoxMessage(
        //     {
        //         turn: turnObj,
        //         data,
        //     }
        // );
        // gameBox.appendChild(newElement);
        closeModal();
    }

    const openModal = () => {
        el.style.display = 'block';
    }

    const closeModal = () => {
        el.style.display = 'none';
    }

    const setTurn = (turn) => {
        quill.setContents(turn.paragraph);
        headerInput.value = turn.header;
        idInput.value = turn._id;
        if (turn.date) {
            const date = new Date(turn.date);
            dateInput.value = `${date.getFullYear()}-${(
                '0' +
                (date.getMonth() + 1)
            ).slice(-2)}-${('0' + date.getDate()).slice(-2)}`;
        } else {
            dateInput.value = '';
        }
        if (turn.sourceUrl) {
            sourceUrlInput.value = turn.sourceUrl;
        } else {
            sourceUrlInput.value = '';
        }

        if (turn.imageUrl) {
            imageUrlInput.style.display = 'block';
            imageUrlInput.value = turn.imageUrl;
        } else {
            imageUrlInput.style.display = 'none';
            imageUrlInput.value = '';
        }

        if (turn.videoUrl) {
            videoUrlInput.style.display = 'block';
            videoUrlInput.value = turn.videoUrl;
        } else {
            videoUrlInput.style.display = 'none';
            videoUrlInput.value = '';
        }
    }

    /* ПРИВЯЗКА СОБЫТИЙ */
    closeBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', saveModal);

    return {
        openModal,
        setTurn
    }
}

const getPopup = (inputDiv) => {
    if (!popup) {
        popup = createPopup(inputDiv);
    }
    return popup;
}

export {
    getPopup
}






