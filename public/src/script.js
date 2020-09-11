function getInputValue(id) {
    // обработчик поля Input
    let input = document.getElementById(id);
    let text = input.value;
    input.value = "";
    return text;
}

function addNewBoxToGame() {
    // вставляет новый блок источника на поле
    let header = getInputValue("headerText");
    let par = getInputValue("paragraphText"); // вводит текст параграфа
    let newTurn = {
        header: header,
        paragraph: [{insert: par}]
    };
    saveTurn(newTurn, (data) => {
        let newDiv = makeNewBoxMessage(header, par, data._id, data.x, data.y);
        gameBox.appendChild(newDiv); // добавляет новый div к заданному div
        $(newDiv).resizable();
        $(newDiv).draggable(); //{containment: "#gameBox"});
    });
}

function addTextToParagraph(par, text) {
    if (Array.isArray(text)) {
        par.innerHTML = '';
        const innerPar = document.createElement('p');
        // par.innerHTML = text.map((el) => `<span>${el.insert}</span>`).join("");
        for (let textItem of text) {
            const spanEl = document.createElement("span");
            if (textItem.attributes) {
                for (let property of Object.keys(textItem.attributes)) {
                    spanEl.style[property] = textItem.attributes[property];
                }
            }
            spanEl.innerText = textItem.insert;
            innerPar.appendChild(spanEl);
        }
        par.appendChild(innerPar);
    } else {
        par.innerHTML = text;
    }
    return par;
}

function makeParagraph(text) {
    let par = document.createElement("p");
    par.className = "paragraphText";
    return addTextToParagraph(par, text);
}

function makeHead(text) {
    let h = document.createElement("h5");
    h.className = "headerText";
    h.innerHTML = text;
    return h;
}

function makeEditButton(turn) {
    let button = document.createElement("button");
    button.innerHTML = "Edit";
    button.addEventListener("click", () => {
        openTurnModal(turn);
    });
    return button;
}

function makeDeleteButton(turn) {                                // refactor with makeEditButton()
    let button = document.createElement("button");
    button.innerHTML = "Delete";
    button.addEventListener("click", () => {
        // deleteTurn(turn);
    });
    return button;
}


function makeNewBoxMessage(headStr, parStr, id, x, y, height, width) {
    let param = {
        head: headStr,
        par: parStr,
    };
    // создаёт div блока по заданным параметрам
    let elmnt = document.createElement("div");
    elmnt.setAttribute("data-id", id);
    elmnt.style.left = `${x}px`;
    elmnt.style.top = `${y}px`;
    elmnt.style.height = `${height}px`;
    elmnt.style.width = `${width}px`;
    elmnt.className = "textBox ui-widget-content";
    let p = makeParagraph(parStr);
    let h = makeHead(headStr);
    let editButton = makeEditButton({_id: id, paragraph: parStr, header: headStr});
    let deleteButton = makeDeleteButton({_id: id, paragraph: parStr, header: headStr});
    h.appendChild(editButton);
    h.appendChild(deleteButton);
    elmnt.appendChild(h);
    elmnt.appendChild(p);
    /*elmnt.innerHTML = "<h4 class='headerText'>" + headStr + "" +
        "<button onclick='openTurnModal()'>edit</button></h4><hr><p class='paragraphText'>" + parStr + "</p>";*/

    // *************************************************************************************

    //  elmnt.addEventListener('mousemove', (e) => {...});    - window.event is deprecated
    /* elmnt.onmousedown = dragMouseDown;
   
     function dragMouseDown(e) {
       e = e || window.event;
       e.preventDefault();
       // get the mouse cursor position at startup:
       pos3 = e.clientX;
       pos4 = e.clientY;
       document.onmouseup = closeDragElement;
       // call a function whenever the cursor moves:
       document.onmousemove = elementDrag;
     }
   
     function elementDrag(e) {
       e = e || window.event;
       e.preventDefault();
       // calculate the new cursor position:
       pos1 = pos3 - e.clientX;
       pos2 = pos4 - e.clientY;
       pos3 = e.clientX;
       pos4 = e.clientY;
       // set the element's new position:
       elmnt.style.top = pos4 - 100 + "px";
       elmnt.style.left = pos3 - 500 + "px";
       // elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
       // elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
     }
   
     function closeDragElement() {
       // stop moving when mouse button is released:
       document.onmouseup = null;
       document.onmousemove = null;
     }*/

    // **************************************************************************************

    return elmnt;
}

function addNewClass() {
    // создаёт поле нового класса, напр. "PERSON"
    let newClassName = getInputValue("newClassName");
    let newClassDiv = createClassField(newClassName);
    insertNewClass(newClassDiv);
}

function createClassField(name) {
    let uniqueInputId = "classInput" + name;
    let uniqueUlId = "classUl" + name;
    let div = document.createElement("div");
    div.className = "row";
    div.innerHTML =
      "<h5>" +
      name +
      "</h5>" +
      "<ul id='" +
      uniqueUlId +
      "'></ul>" +
      "<input id='" +
      uniqueInputId +
      "'> " +
      "<button onclick='insertNewClassElement(" +
      uniqueInputId +
      "," +
      uniqueUlId +
      ")'>Add Element</button>";
    return div;
}

function insertNewClass(childClass) {
    let parent = document.getElementById("classMenu");
    parent.appendChild(childClass);
}

function insertNewClassElement(input, ul) {
    let value = input.value;
    input.value = "";
    let li = document.createElement("li");
    li.innerHTML = value;
    ul.appendChild(li);
}

const saveFieldSettings = (settings) => {
    // left, top,
    // width, height
    localStorage.setItem('gameField', JSON.stringify(settings))
}

const getFieldSettings = () => {
    const settings = JSON.parse(localStorage.getItem('gameField')) || {
        left: 0,
        top: 0,
        width: 1000,
        height: 1000
    }
    return settings;
}



