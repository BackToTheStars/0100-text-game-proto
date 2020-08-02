
let input = document.getElementById(id);

let div = document.createElement("div");

div.className = "textBox";

div.innerHTML = "<h4 class='headerText'>" + headStr + "</h4><hr><p class='paragraphText'>" + parStr + "</p>";

gameBox.appendChild(newDiv);


let id = 'someId'
headStr = 'someHeadStr'
parStr = 'someParStr'
newDiv = 'someNewDiv'