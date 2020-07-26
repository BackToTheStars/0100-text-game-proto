// todo: 1) Typescript

let gameBox = document.getElementById("gameBox");

function getInputValue(id) {
  let input = document.getElementById(id);
  let text = input.value;
  input.value = "";
  return text;
}

function makeNewBoxMessage(headStr, parStr) {
  let div = document.createElement("div");
  div.className = "textBox";
  div.innerHTML = "<h1 class='headerText'>" + headStr + "</h1><hr><p class='paragraphText'>" + parStr + "</p>";
  return div;
}

function addNewBoxTOGame() {
  let header = getInputValue("headerText");
  let par = getInputValue("paragraphText");
  let newDiv = makeNewBoxMessage(header, par);
  gameBox.appendChild(newDiv);
}

function insertNewClassElement(input, ul) {
  let value = input.value;
  input.value = "";
  let li = document.createElement("li");
  li.innerHTML = value;
  ul.appendChild(li);
}

function createClassField(name) {
  let uniqueInputId = "classInput" + name;
  let uniqueUlId = "classUl" + name;
  let div = document.createElement("div");
  div.className = "row";
  div.innerHTML = "<h3>" + name + "</h3>" +
    "<ul id='" + uniqueUlId + "'></ul>" +
    "<input id='" + uniqueInputId + "'> " +
    "<button onclick='insertNewClassElement(" + uniqueInputId + "," + uniqueUlId + ")'>add</button>";
  return div;
}

function insertNewClass(childClass) {
  let parent = document.getElementById("classMenu");
  parent.appendChild(childClass);
}

function addNewClass() {
  let newClassName = getInputValue("newClassName");
  let newClassDiv = createClassField(newClassName);
  insertNewClass(newClassDiv);
}














