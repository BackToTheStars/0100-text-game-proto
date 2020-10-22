function showElement(id) {
    let elem = document.getElementById(id);
    elem.style.display = 'block';
}

function hideElement(id) {
    let elem = document.getElementById(id);
    elem.style.display = 'none';
}

function writeParagraph(id, text) {
    //console.log(text[0]);
    let editor = document.getElementById(id);
    let elem = editor.getElementsByClassName('ql-editor')[0];
    //elem.innerText = text[0];
    //addTextToParagraph(elem, text);
    console.log(`${arguments.callee.name}: text: ${JSON.stringify(text)}`);
    quill.setContents(text);
}

function cancelTurnModal() {
    hideElement('modalBackground');
    hideElement('modal');
}

function openTurnModal(turn) {
    showElement('modalBackground');
    showElement('modal');
    // debugger;
    writeParagraph('editor-container', turn.paragraph);
    // writeToHeader("headerInput", turn.header);

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
}

function recreateOnclickModalSave(id) {
    let button = document.getElementById('modalSaveButton');
    button.setAttribute('onclick', "saveTurnModal('" + id + "')");
}

function saveTurnModal(id) {
    hideElement('modalBackground');
    hideElement('modal');
    let textArr = getQuillTextArr();
    let header = getInputValue('headerInput');
    let date = getInputValue('dateInput');
    let sourceUrl = getInputValue('sourceUrlInput');
    let imageUrl = getInputValue('imageUrlInput');
    let videoUrl = getInputValue('videoUrlInput');
    let turnObj = {
        header,
        date,
        sourceUrl,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        paragraph: textArr,
        _id: id,
    };

    updateTurn(turnObj, (data) => {
        // openTurnModal(data);

        const element = document.querySelector(`[data-id = "${data._id}"]`);
        element.remove();

        const newElement = makeNewBoxMessage(
            {
                turn: turnObj,
                data,
            }
            /*          data.header,
                      data.paragraph,
                      data._id,
                      data.x,
                      data.y
                      */
        );
        gameBox.appendChild(newElement);
    });
}
