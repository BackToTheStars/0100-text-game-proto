
/** Client code */
let gameBox = document.getElementById("gameBox"); // выбирает элемент по id
let gameTurns = [];
let lineInfoEls = [];
let newLineInfoEl = {
    sourceTurnId: null,
    sourceMarker: null,
    targetTurnId: null,
    targetMarker: null,
}

const setSizes = (jQueryElement) => {
    $(jQueryElement).css('height', $(jQueryElement).height() + 'px');
    $(jQueryElement).css('width', $(jQueryElement).width() + 'px');
}

const drawLine = (gameBox, x1, y1, x2, y2) => {
    if ($("#lines").length) {
        $("#lines").remove();
    }
    const line = $(`<svg viewBox="0 0 ${$("#gameBox").width()} ${$("#gameBox").height()}" xmlns="http://www.w3.org/2000/svg" id="lines">
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="red" stroke-width="1" />
  </svg>`);
    $(gameBox).append(line);
}

const getMarkerCoords = (turnId, markerPos) => {  // берём координаты жёлтых цитат
    const element = $(`[data-id = "${turnId}"]`);
    const markerEls = element.find(".paragraphText span").toArray().filter(spanEl => {
        return $(spanEl).css('background-color') === "rgb(255, 255, 0)";
    });
    // console.log($(markerEls[markerPos]).offset())
    // console.log($(markerEls[markerPos]).width())
    return {
        left: $(markerEls[markerPos]).offset()['left'],
        top: $(markerEls[markerPos]).offset()['top'],
        width: $(markerEls[markerPos]).width(),
        height: $(markerEls[markerPos]).height(),
    }
}

const getYellowElements = (turnId) => {
    const element = $(`[data-id = "${turnId}"]`);
    return element.find(".paragraphText span").toArray().filter(spanEl => {
        return $(spanEl).css('background-color') === "rgb(255, 255, 0)"; 
    });
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
        getYellowElements(elem._id).forEach((el, index) => {
            $(el).click((event)=> {
                $(el).addClass('red-link-line');
                if (!newLineInfoEl.sourceTurnId) {
                    newLineInfoEl.sourceTurnId = elem._id;
                    newLineInfoEl.sourceMarker = index;
                } else {
                    newLineInfoEl.targetTurnId = elem._id;
                    newLineInfoEl.targetMarker = index;
                    lineInfoEls.push(newLineInfoEl)
                    
                    newLineInfoEl = {   // reset 
                        sourceTurnId: null,
                        sourceMarker: null,
                        targetTurnId: null,
                        targetMarker: null,
                    }

                    drawLinesByEls(lineInfoEls);
                }
                //alert(`${elem._id} ${index}`)
                //alert('yellow el was clicked!');
            }) 
        });
    }
    $('.textBox').resizable();
    $('.textBox').draggable();

    // отрисовка линий
    // получение координат
    lineInfoEls = [
    //     {
    //     sourceTurnId: '5f602d2f84471e68ecccde35',
    //     sourceMarker: 0,
    //     targetTurnId: '5f602dd884471e68ecccde36',
    //     targetMarker: 0,
    // }
    ]

    drawLinesByEls(lineInfoEls);
});

function drawLinesByEls(lineInfoEls) {  
                        // функция рисования красной линии логической связи из точки "А" в точку "Б" 
    
    for (let lineInfo of lineInfoEls) {
        const sourceCoords = getMarkerCoords(lineInfo.sourceTurnId, lineInfo.sourceMarker);
        const targetCoords = getMarkerCoords(lineInfo.targetTurnId, lineInfo.targetMarker);
        const sideBarWidth = $("#classMenu").width() + 45;

        const sourceFirst = sourceCoords.left < targetCoords.left;
        const line = {
            x1: sourceCoords.left + (sourceFirst ? sourceCoords.width : 0) - sideBarWidth + 3,
            y1: sourceCoords.top + Math.floor(sourceCoords.height / 2),
            x2: targetCoords.left + (sourceFirst ? 0 : targetCoords.width) - sideBarWidth - 5,
            y2: targetCoords.top + Math.floor(targetCoords.height / 2),
        }
        // отрисовка координат
        drawLine(gameBox, line.x1, line.y1, line.x2, line.y2)
    }
}

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
        drawLinesByEls(lineInfoEls);
        // console.log(ui.position.left);
        // console.log(ui.position.top);
        // console.log(ui.helper);
    }
});