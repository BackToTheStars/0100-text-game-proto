heroku git:remote -a discourse-prototype
git push heroku master


// 10-15-2020
// installed bunyan - logger



// почитать про rem, em, 


// вопрос: почему мы используем Ajax а не Axios?
// свои атрибуты html: data-id


document.querySelector('textBox[data-id="123"]')
elmnt.setAttribute('data-id', id);


let input = document.getElementById(id);

let div = document.createElement("div");

div.className = "textBox";

div.innerHTML = "<h4 class='headerText'>" + headStr + "</h4><hr><p class='paragraphText'>" + parStr + "</p>";

gameBox.appendChild(newDiv);


let id = 'someId'
headStr = 'someHeadStr'
parStr = 'someParStr'
newDiv = 'someNewDiv'