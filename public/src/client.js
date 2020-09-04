
/** Client code */
let gameBox = document.getElementById("gameBox"); // выбирает элемент по id


getTurns((data) => {
  for (let elem of data) {
    let newDiv = makeNewBoxMessage(
      elem.header,
      elem.paragraph,
      elem._id,
      elem.x,
      elem.y
    );
    gameBox.appendChild(newDiv);
  }
  $('.textBox').resizable();
  //{aspectRatio: true}
  $('.textBox').draggable({containment: "#gameBox"});
});

const buttonSavePositions = document
  .querySelector("#saveTurnPositionsToDb")
  .addEventListener("click", (e) => {
    e.preventDefault();
    const textBoxes = document.querySelectorAll(".textBox");
    const payload = [];
    for (let textBox of textBoxes) {
      const x = parseInt(textBox.style.left) || 0;
      const y = parseInt(textBox.style.top) || 0;
      const id = textBox.getAttribute("data-id");
      payload.push({x, y, id});
    }
    turnsUpdateCoordinates(payload, function () {
      console.log("Positions of all turns re-saved.");
    });
  });


const getGame = (gameBox, fieldSettings) => {
  // gameBox
  // fieldSettings
  const render = () => {                                            // инкапсуляция переменных
    gameBox.style.left = fieldSettings.left + 'px';
    gameBox.style.top = fieldSettings.top + 'px';
  }

  const recalculate = () => {
    // найти textboxes
    const textBoxElements = document.querySelectorAll('.textBox')
    const left = parseInt(gameBox.style.left);
    const top = parseInt(gameBox.style.top);
    // пересчитать настройки
    for (let textBoxElement of textBoxElements) {
      textBoxElement.style.left = parseInt(textBoxElement.style.left) + left + 'px';
      textBoxElement.style.top = parseInt(textBoxElement.style.top) + top + 'px';
    }
    gameBox.style.left = 0;
    gameBox.style.top = 0;
    saveFieldSettings({
      left: 0,
      top: 0
    })
  }

  return {
    recalculate: recalculate,                         // возвращаем две верёвки методов, можем за них дёргать
    render: render
  }
}

fieldSettings = getFieldSettings();
const game = getGame(gameBox, fieldSettings);
game.render();

$('#gameBox').draggable({
  stop: function (event, ui) {
    saveFieldSettings({
      left: ui.position.left,
      top: ui.position.top,
      height: 1000,
      width: 1000,
    })
    game.recalculate();
    // console.log(ui.position.left);
    // console.log(ui.position.top);
    // console.log(ui.helper);
  }
});