// @deprecated
// УНИВЕРСАЛЬНОЕ ОКНО СОЗДАНИЯ И РЕДАКТИРОВАНИЯ ХОДА

import { getQuill } from './quillHandler';
import { createTurn, updateTurn } from './service';
import { getTurn } from './turn';

let popup = null;
const createPopup = (inputDiv, triggers) => {

    // переменные и инициализация (constructor)
    let el = document.createElement('div');
    let turnModel;
    drawModalWindow();
    const closeBtn = el.querySelector('#cancel-turn-modal');
    const saveBtn = el.querySelector('#save-turn-modal')

    const defaultContentType = 'picture'
    let contentType = defaultContentType;

    const headerRow = el.querySelector('.header-row')
    const headerInput = headerRow.querySelector('input')

    const dateRow = el.querySelector('.date-row')
    const dateInput = dateRow.querySelector('input')

    const sourceUrlRow = el.querySelector('.source-url-row')
    const sourceUrlInput = sourceUrlRow.querySelector('input')

    const imageUrlRow = el.querySelector('.image-url-row')
    const imageUrlInput = imageUrlRow.querySelector('input')

    const videoUrlRow = el.querySelector('.video-url-row')
    const videoUrlInput = videoUrlRow.querySelector('input')

    const idInput = el.querySelector('#idInput')
    const { quill, getQuillTextArr } = getQuill('#editor-container', '#toolbar-container');
    // применение Quill к divs
    const radioButtonsGroup = el.querySelector('.radio-group');
    const radioButtonTypes = radioButtonsGroup.querySelectorAll('input');

    setTurnType(defaultContentType);

    /* ФУНКЦИИ И МЕТОДЫ */
    // draw modal window
    function drawModalWindow() {
        el.setAttribute('id', 'modalBackground');
        el.innerHTML = `<div id="modal" class="container">
        <div class="row my-4 flex-1">
            <div class="col-8 quill-wrapper">
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
            <div class="radio-group">
                <div class="form-group row">
                    <input type="radio" name="type" value="picture" checked><span>Text / picture</span>
                </div>
                <div class="form-group row">
                    <input type="radio" name="type" value="video"><span>Text / video</span>
                </div>
                <div class="form-group row">
                    <input type="radio" name="type" value="comment"><span>Comment</span>
                </div>
            </div>
            <input type="hidden" id="idInput" />
            <div class="form-group row header-row">
                <label class="col-sm-3 col-form-label">Header</label>
                <div class="col-sm-9">
                    <input type="text" class="form-control">
                </div>
            </div>
            <div class="form-group row date-row">
                <label class="col-sm-3 col-form-label">Date</label>
                <div class="col-sm-9">
                    <input type="date" class="form-control">
                </div>
            </div>
            <div class="form-group row source-url-row">
                <label class="col-sm-3 col-form-label">Source Url</label>
                <div class="col-sm-9">
                    <input type="text" class="form-control">
                </div>
            </div>
            <div class="form-group row image-url-row">
                <label class="col-sm-3 col-form-label">Image Url</label>
                <div class="col-sm-9">
                    <input type="text" class="form-control">
                </div>
            </div>
            <div class="form-group row video-url-row">
                <label class="col-sm-3 col-form-label">Video Url</label>
                <div class="col-sm-9">
                    <input type="text" class="form-control">
                </div>
            </div>
        </div>

    </div>
    <div class="row mb-4">
        <div class="col">
            <button id="save-turn-modal">Save</button>
            <button id="cancel-turn-modal">Cancel</button>
        </div>
    </div>
    </div>`

        inputDiv.appendChild(el);
    }

    function setTurnType(type) {
        contentType = type;
        imageUrlRow.style.display = 'none';
        videoUrlRow.style.display = 'none';
        headerRow.style.display = 'flex';
        sourceUrlRow.style.display = 'flex';
        switch (type) {
            case 'picture': {
                imageUrlRow.style.display = 'flex';
                break;
            };
            case 'video': {
                videoUrlRow.style.display = 'flex';
                break;
            };
            case 'comment': {
                headerRow.style.display = 'none';
                sourceUrlRow.style.display = 'none';
                break;
            };
        };
    };

    // change type
    const showError = msg => {
        console.log(msg);
    }

    const saveModal = async () => {
        let textArr = getQuillTextArr();
        let id = idInput.value;
        let header = headerInput.value;
        let date = dateInput.value;
        let sourceUrl = sourceUrlInput.value;
        let imageUrl = imageUrlInput.value;
        let videoUrl = videoUrlInput.value;
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
            if (id) {
                triggers.dispatch('SAVE_TURN', turnObj);
                closeModal();

            } else {
                turnObj = {
                    contentType: contentType,
                    height: 500,
                    width: 500,
                    x: 50,
                    y: 50,
                    ...turnObj
                }
                triggers.dispatch('CREATE_TURN', turnObj);
                closeModal();
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

    const openModal = () => { // сброс всех переменных для modal window
        idInput.value = '';
        el.style.display = 'block';
        radioButtonsGroup.style.display = 'flex';
        setTurnType(defaultContentType);
        headerInput.value = '';
        quill.setContents([]);
        dateInput.value = '';
        sourceUrlInput.value = '';
        imageUrlInput.value = '';
        videoUrlInput.value = '';
    }

    const closeModal = () => {
        el.style.display = 'none';
    }

    const setTurn = (turn) => {                // подставляет данные в инпуты
        // turnModel = turnModelParam
        // const turn = turnModelParam.data;
        quill.setContents(turn.paragraph);
        headerInput.value = turn.header;
        idInput.value = turn._id;
        radioButtonsGroup.style.display = 'none';
        setTurnType(turn.contentType);

        if (turn.date) {
            const date = new Date(turn.date);
            dateInput.value = `${date.getFullYear()}-${(
                '0' +
                (date.getMonth() + 1)
            ).slice(-2)}-${('0' + date.getDate()).slice(-2)}`;
        }

        if (turn.sourceUrl) {
            sourceUrlInput.value = turn.sourceUrl;
        }

        if (turn.imageUrl) {
            imageUrlInput.value = turn.imageUrl;
        }

        if (turn.videoUrl) {
            videoUrlInput.value = turn.videoUrl;
        }
    }

    /* ПРИВЯЗКА СОБЫТИЙ */

    closeBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', saveModal);
    radioButtonTypes.forEach((button) => {
        button.addEventListener('click', () => setTurnType(button.value));
    });

    el.addEventListener('click', (e) => (e.target.getAttribute('id') == "modalBackground") && closeModal())

    return {
        openModal,
        setTurn
    }
}

const getPopup = (inputDiv, triggers) => {
    if (!popup) {
        popup = createPopup(inputDiv, triggers);
    }
    return popup;
}

export {
    getPopup
}






