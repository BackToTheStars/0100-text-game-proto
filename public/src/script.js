// todo:
//  1) Typescript
//  2) Mouse movements for block and for game field
//  3) поработать над CSS, flex grid bootstrap
//  4) подсвечивание текста цитаты


let gameBox = document.getElementById("gameBox"); // выбирает элемент по id

function getInputValue(id) {                               // обработчик поля Input
  let input = document.getElementById(id);
  let text = input.value;
  input.value = "";
  return text;
}

function addNewBoxToGame() {                               // вставляет новый блок источника на поле
  let header = getInputValue("headerText");
  let par = getInputValue("paragraphText");             // вводит текст параграфа
  let newTurn = {
    header: header,
    paragraph: par
  }
  saveTurn(newTurn, (data)=>{
    let newDiv = makeNewBoxMessage(header, par);
    gameBox.appendChild(newDiv);      // добавляет новый div к заданному div
  })
}

function makeParagraph(text) {
    let par = document.createElement("p");
    par.className = "paragraphText";
    par.innerHTML = text;
    return par;
}

function makeHead(text) {
  let h = document.createElement("h4");
  h.className = "headerText";
  h.innerHTML = text;
  return h;
}

function makeButton(turn) {
  let button = document.createElement("button");
  button.innerHTML = "edit";
  button.addEventListener('click', ()=>{
    openTurnModal(turn);
  });
  return button;
}

function makeNewBoxMessage(headStr, parStr) {
  let param = {
    head: headStr,
    par: parStr
  }
  // создаёт div блока по заданным параметрам
  let elmnt = document.createElement("div");
  elmnt.className = "textBox";
  let p = makeParagraph(parStr);
  let h = makeHead(headStr);
  let button = makeButton(param);
  h.appendChild(button);
  elmnt.appendChild(h);
  elmnt.appendChild(p);
  /*elmnt.innerHTML = "<h4 class='headerText'>" + headStr + "" +
      "<button onclick='openTurnModal()'>edit</button></h4><hr><p class='paragraphText'>" + parStr + "</p>";*/


// *************************************************************************************

//  elmnt.addEventListener('mousemove', (e) => {...});    - window.event is deprecated
  elmnt.onmousedown = dragMouseDown;

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
  }

// **************************************************************************************
  return elmnt;
}

function addNewClass() {                                    // создаёт поле нового класса, напр. "PERSON"
  let newClassName = getInputValue("newClassName");
  let newClassDiv = createClassField(newClassName);
  insertNewClass(newClassDiv);
}

function createClassField(name) {
  let uniqueInputId = "classInput" + name;
  let uniqueUlId = "classUl" + name;
  let div = document.createElement("div");
  div.className = "row";
  div.innerHTML = "<h5>" + name + "</h5>" +
    "<ul id='" + uniqueUlId + "'></ul>" +
    "<input id='" + uniqueInputId + "'> " +
    "<button onclick='insertNewClassElement(" + uniqueInputId + "," + uniqueUlId + ")'>Add Element</button>";
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


getTurns( (data) => {
  let parsedArr = JSON.parse(data);
  parsedArr.forEach( (elem) => {
    let newDiv = makeNewBoxMessage(elem.header, elem.paragraph);
    gameBox.appendChild(newDiv);
  })
})








