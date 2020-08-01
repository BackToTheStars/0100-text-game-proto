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
  let newDiv = makeNewBoxMessage(header, par);
  gameBox.appendChild(newDiv);                             // добавляет новый div к заданному div
}

function makeNewBoxMessage(headStr, parStr) {              // создаёт div блока по заданным параметрам
  let div = document.createElement("div");
  div.className = "textBox";
  div.innerHTML = "<h4 class='headerText'>" + headStr + "</h4><hr><p class='paragraphText'>" + parStr + "</p>";
  return div;
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











