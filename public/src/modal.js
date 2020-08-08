
function showElement(id){
    let elem = document.getElementById(id);
    elem.style.display = "block";
}

function hideElement(id) {
    let elem = document.getElementById(id);
    elem.style.display = "none";
}

function writeText(id, text) {
    let elem = document.getElementById(id);
    elem.innerText = text;
}

function closeTurnModal() {
    hideElement("modalBackground");
    hideElement("modal");
}

function openTurnModal(turn) {
    showElement("modalBackground");
    showElement("modal");
    writeText("modalHead", turn.head);
    writeText("modalPar", turn.par);
}