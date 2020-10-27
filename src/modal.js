import { quill, getQuillTextArr } from './quillHandler';
import { getInputValue, makeNewBoxMessage } from './script';
import { updateTurn } from './service';

function showElement(id) {
    let elem = document.getElementById(id);
    elem.style.display = 'block';
}

function hideElement(id) {
    let elem = document.getElementById(id);
    elem.style.display = 'none';
}

function writeParagraph(id, text) {
    let editor = document.getElementById(id);
    let elem = editor.getElementsByClassName('ql-editor')[0];
    quill.setContents(text);
}

const cancelTurnModal = () => {
    hideElement('modalBackground');
    hideElement('modal');
};

const openTurnModal = (turn) => {
    showElement('modalBackground');
    showElement('modal');
    writeParagraph('editor-container', turn.paragraph);

    document.getElementById('headerInput').value = turn.header;
    if (turn.date) {
        const date = new Date(turn.date);
        document.getElementById('dateInput').value = `${date.getFullYear()}-${(
            '0' +
            (date.getMonth() + 1)
        ).slice(-2)}-${('0' + date.getDate()).slice(-2)}`;
    } else {
        document.getElementById('dateInput').value = '';
    }
    if (turn.sourceUrl) {
        document.getElementById('sourceUrlInput').value = turn.sourceUrl;
    } else {
        document.getElementById('sourceUrlInput').value = '';
    }

    if (turn.imageUrl) {
        document.getElementById('imageUrlInput').style.display = 'block';
        document.getElementById('imageUrlInput').value = turn.imageUrl;
    } else {
        document.getElementById('imageUrlInput').style.display = 'none';
        document.getElementById('imageUrlInput').value = '';
    }

    if (turn.videoUrl) {
        document.getElementById('videoUrlInput').style.display = 'block';
        document.getElementById('videoUrlInput').value = turn.videoUrl;
    } else {
        document.getElementById('videoUrlInput').style.display = 'none';
        document.getElementById('videoUrlInput').value = '';
    }

    recreateOnclickModalSave(turn._id);
};

function recreateOnclickModalSave(id) {
    let button = document.getElementById('modal-save-button');
    button.addEventListener('click', (e) => saveTurnModal(id));
}


export { openTurnModal };
