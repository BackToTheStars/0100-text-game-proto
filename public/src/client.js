
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

$('#gameBox').draggable({
  stop: function (event, ui) {
    saveFieldCoords({
      left: ui.position.left,
      top: ui.position.top
    })
    // console.log(ui.position.left);
    // console.log(ui.position.top);
    // console.log(ui.helper);
  }
});

const coords = getFieldCoords();

// $('#gameBox').css({
//   left: coords.left,
//   top: style.top
// });

gameBox.style.left = coords.left + 'px';
gameBox.style.top = coords.top + 'px';

    // {containment: ".gameFieldWrapper"});



