
function showElement(id){
    let elem = document.getElementById(id);
    elem.style.display = "block";
}

function hideElement(id) {
    let elem = document.getElementById(id);
    elem.style.display = "none";
}

function writeParagraph(id, text) {
    let editor = document.getElementById(id);
    let elem = editor.getElementsByClassName("ql-editor")[0];
    elem.innerText = text
}

function writeToHeader(id, text) {
    let header = document.getElementById(id);
    header.value = text;
}

function cancelTurnModal() {
    hideElement("modalBackground");
    hideElement("modal");
}

function openTurnModal(turn) {
    showElement("modalBackground");
    showElement("modal");
    writeParagraph("editor-container", turn.paragraph);
    writeToHeader("headerInput", turn.header);
    recreateOnclickModalSave(turn._id);
}

function recreateOnclickModalSave(id) {
    let button = document.getElementById("modalSaveButton");
    button.setAttribute("onclick", "saveTurnModal('"+id+"')");
}


function saveTurnModal(id) {
    hideElement("modalBackground");
    hideElement("modal");
    let textArr = getQuillTextArr();
    let header = getInputValue("headerInput");
    let turnObj = {
        header: header,
        paragraph: textArr,
        _id: id
    }
    updateTurn(turnObj, (data)=>{
        console.log(data);
    })
}