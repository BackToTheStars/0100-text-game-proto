
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

function closeTurnModal() {
    hideElement("modalBackground");
    hideElement("modal");
}

function openTurnModal(turn) {
    showElement("modalBackground");
    showElement("modal");
    writeParagraph("editor-container", turn.par);
    writeToHeader("headerInput", turn.head);
}