
/** Client code */
let gameBox = document.getElementById("gameBox"); // выбирает элемент по id
let gameTurns = [];

const setSizes = (jQueryElement) => {
    $(jQueryElement).css('height', $(jQueryElement).height() + 'px');
    $(jQueryElement).css('width', $(jQueryElement).width() + 'px');
}

const drawLine = (gameBox, x1, y1, x2, y2) => {
    const line = $(`<svg viewBox="0 0 ${$("#gameBox").width()} ${$("#gameBox").height()}" xmlns="http://www.w3.org/2000/svg" class="line">
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="red" stroke-width="1" />
  </svg>`);
    //$(gameBox).append(line);
}

getTurns((data) => {    // Запрашиваем ходы с сервера и размещаем их на доске игры
    gameTurns = data;
    for (let elem of data) {
        let newDiv = makeNewBoxMessage(
            elem.header,
            elem.paragraph,
            elem._id,
            elem.x,
            elem.y,
            elem.height,
            elem.width
        );
        gameBox.appendChild(newDiv); // само добавление div-ов ходов
    }
    $('.textBox').resizable();
    $('.textBox').draggable();

    // отрисовка линий
    // получение координат
    const line = {
        x1: 972 - 338,
        y1: 165,
        x2: 1270 - 338,
        y2: 192
    }
    // отрисовка координат
    drawLine(gameBox, line.x1, line.y1, line.x2, line.y2)
});

function buttonSavePositions(e) {
    // e.preventDefault();
    const textBoxes = document.querySelectorAll(".textBox");
    const payload = [];
    for (let textBox of textBoxes) {
        const x = parseInt(textBox.style.left) || 0;
        const y = parseInt(textBox.style.top) || 0;
        const height = parseInt(textBox.style.height);
        const width = parseInt(textBox.style.width);
        const id = textBox.getAttribute("data-id");
        const contentType = 'article';
        payload.push({ x, y, height, width, id, contentType });
    }
    turnsUpdateCoordinates(payload, function () {
        console.log("Positions of all turns re-saved.");
    });
};


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