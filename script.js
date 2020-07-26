// todo: 1) Typescript


let gameBox = document.getElementById("gameBox");

const getNewHeaderInput = () => {
  let input = document.getElementById("headerText");
  return input.value;
}

const getNewParagraphInput = () => {
  let input = document.getElementById("paragraphText");
  return input.value;
}

const makeNewBoxMessage = (headStr, parStr) => {
  let div = document.createElement("div");
  div.className = "textBox";
  div.innerHTML = "<h1>" + headStr + "</h1><hr><p>" + parStr + "</p>";
  return div;
}

const addNewBoxToGame = () => {
  let header = getNewHeaderInput();
  let par = getNewParagraphInput();
  let newDiv = makeNewBoxMessage(header, par);
  gameBox.appendChild(newDiv);
}














