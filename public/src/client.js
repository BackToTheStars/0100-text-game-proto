
/** Client code */
let gameBox = document.getElementById("gameBox"); // выбирает элемент по id
let gameTurns = [];
let lineInfoEls = getLinesSettings();
let newLineInfoEl = {
    sourceTurnId: null,
    sourceMarker: null,
    targetTurnId: null,
    targetMarker: null,
}
let quotesDictionary = {};

const setSizes = (jQueryElement) => {
    $(jQueryElement).css('height', $(jQueryElement).height() + 'px');
    $(jQueryElement).css('width', $(jQueryElement).width() + 'px');
}

const getLine = (gameBox, x1, y1, x2, y2) => {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="red" stroke-width="1" />`;
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

function deleteLink() {
    console.log();
}

function showLinesInfoPanel(quote, quoteLines) {
    const panelEl = $('.link-lines-info');
    panelEl.html(`<table>
        <thead>
            <tr><th>from</th><th>to</th><th>actions</th></tr>
        </thead>
        <tbody>
            ${quoteLines.map((el) => {
                return `<tr>
                    <td>${quotesDictionary[el.sourceTurnId][el.sourceMarker]}</td>
                    <td>${quotesDictionary[el.targetTurnId][el.targetMarker]}</td>
                    <td>
                        <button onClick="deleteLink()">Delete</button>
                    </td>
                </tr>`
            }).join('')}
        </tbody>
    </table>`)
};


getTurns((data) => {    // Запрашиваем ходы с сервера и размещаем их на доске игры
    gameTurns = data;
    quotesDictionary = {};

    for (let elem of data) {
        quotesDictionary[elem._id] = [];
        let newDiv = makeNewBoxMessage({
            turn: elem,
            data: elem
        }
            /*          elem.header,
                        elem.paragraph,
                        elem._id,
                        elem.x,
                        elem.y,
                        elem.height,
                        elem.width
                        */
        );
        gameBox.appendChild(newDiv); // само добавление div-ов ходов

        getYellowElements(elem._id).forEach((el, index) => {
            
            quotesDictionary[elem._id].push($(el).text().trim())
            
            $(el).click((event) => {
                $(el).addClass('red-link-line');
                if (!newLineInfoEl.sourceTurnId) {
                    newLineInfoEl.sourceTurnId = elem._id;
                    newLineInfoEl.sourceMarker = index;
                } else {
                    newLineInfoEl.targetTurnId = elem._id;
                    newLineInfoEl.targetMarker = index;
                    lineInfoEls.push(newLineInfoEl);
                    saveLinesSettings(lineInfoEls);

                    newLineInfoEl = {   // reset 
                        sourceTurnId: null,
                        sourceMarker: null,
                        targetTurnId: null,
                        targetMarker: null,
                    }
                    drawLinesByEls(lineInfoEls);
                }

                const selectedQuote = lineInfoEls.filter((element) => {
                    return (element.sourceTurnId === elem._id && element.sourceMarker === index)
                    || (element.targetTurnId === elem._id && element.targetMarker === index);  
                });
                
                showLinesInfoPanel({turnId:elem._id,markerId:index},selectedQuote);
               
                //alert(`${elem._id} ${index}`)
                //alert('yellow el was clicked!');
            })
        });
    }
    $('.textBox').resizable();
    $('.textBox').draggable();

    // отрисовка линий
    // получение координат
    // lineInfoEls = [
        //     {
        //     sourceTurnId: '5f602d2f84471e68ecccde35',
        //     sourceMarker: 0,
        //     targetTurnId: '5f602dd884471e68ecccde36',
        //     targetMarker: 0,
        // }
    // ]

    drawLinesByEls(lineInfoEls);
});

function selectChanged() {
    if (document.getElementById('turnType').value === 'picture') {
        document.getElementById('image-url-wrapper').style.display = 'block';
    } else {
        document.getElementById('image-url-wrapper').style.display = 'none';
    }
}

function drawLinesByEls(lineInfoEls) {
    // функция рисования красной линии логической связи из точки "А" в точку "Б" 
    let linesStr ='';
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
        linesStr += getLine(gameBox, line.x1, line.y1, line.x2, line.y2)
    }
    if ($("#lines").length) {
        $("#lines").remove();
    }
    const svg = $(`<svg viewBox="0 0 ${$("#gameBox").width()} ${$("#gameBox").height()}" xmlns="http://www.w3.org/2000/svg" id="lines">
    ${linesStr}
  </svg>`);
    $(gameBox).append(svg);
}

function buttonSavePositions(e) {
    // e.preventDefault();
    const textBoxes = document.querySelectorAll(".textBox");
    const payload = [];
    for (let textBox of textBoxes) {
        //console.log(textBox.children[0].innerText);
        const x = parseInt(textBox.style.left) || 0;
        const y = parseInt(textBox.style.top) || 0;
        const height = parseInt(textBox.style.height);
        const width = parseInt(textBox.style.width);
        const { id, contentType } = textBox.dataset;
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