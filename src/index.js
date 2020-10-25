import {
    getLinesSettings,
    getPanelSettings,
    makeNewBoxMessage,
    getFieldSettings,
    saveFieldSettings,
    saveLinesSettings,
    savePanelSettings,
    addNewClass,
    addNewBoxToGame,
} from './script.js';

import { getTurns, turnsUpdateCoordinates } from './service';

import {
    toggleLinesZIndex,
    toggleLinesVisibility,
    toggleLeftClassPanel,
} from './toRefactor.js';

import { zoomInOut } from './zoom';

import { cancelTurnModal } from './modal';

import { getPopup } from './popup';

/** Client code */

let gameBox = document.getElementById('gameBox'); // выбирает элемент по id
let gameTurns = [];
let lineInfoEls = [];
getLinesSettings(function (data) {
    lineInfoEls = data;
});
let classesPanelSettings = getPanelSettings();
let linkLineWidth = 2;
let newLineInfoEl = {
    sourceTurnId: null,
    sourceMarker: null,
    targetTurnId: null,
    targetMarker: null,
};
let frontLinesFlag = true;
let quotesDictionary = {};
let authorDictionary = {};

const setSizes = (jQueryElement) => {
    $(jQueryElement).css('height', $(jQueryElement).height() + 'px');
    $(jQueryElement).css('width', $(jQueryElement).width() + 'px');
};

const getLine = (gameBox, x1, y1, x2, y2) => {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="red" stroke-width="${linkLineWidth}" />`;
};

const getMarkerCoords = (turnId, markerPos) => {
    // берём координаты жёлтых цитат
    const element = $(`[data-id = "${turnId}"]`);
    const markerEls = element
        .find('.paragraphText span')
        .toArray()
        .filter((spanEl) => {
            return $(spanEl).css('background-color') === 'rgb(255, 255, 0)';
        });
    return {
        left: $(markerEls[markerPos]).offset()['left'],
        top: $(markerEls[markerPos]).offset()['top'],
        width: $(markerEls[markerPos]).width(),
        height: $(markerEls[markerPos]).height(),
    };
};

const getYellowElements = (turnId) => {
    const element = $(`[data-id = "${turnId}"]`);
    return element
        .find('.paragraphText span')
        .toArray()
        .filter((spanEl) => {
            return $(spanEl).css('background-color') === 'rgb(255, 255, 0)';
        });
};

const getYellowElement = (turnId, markerId) => {
    const elements = getYellowElements(turnId);
    return elements[markerId];
};

const markYellowElementsWithRed = (lineInfoEls) => {
    $('.red-link-line').removeClass('red-link-line');
    for (let lineInfoEl of lineInfoEls) {
        const leftEl = getYellowElement(
            lineInfoEl.sourceTurnId,
            lineInfoEl.sourceMarker
        );
        $(leftEl).addClass('red-link-line');
        const rightEl = getYellowElement(
            lineInfoEl.targetTurnId,
            lineInfoEl.targetMarker
        );
        $(rightEl).addClass('red-link-line');
    }
};

function deleteLink() {
    // удаляет линию связи между жёлтами цитатами
    console.log();
}

function showLinesInfoPanel(quote, quoteLines) {
    // показывает информацию, что связано с этой цитатой
    const panelEl = $('.link-lines-info');
    panelEl.html(`<table>
        <thead>
            <tr><th>from</th><th>to</th><th>actions</th></tr>
        </thead>
        <tbody>
            ${quoteLines
            .map((el) => {
                return `<tr
            class="link-line-details"
            data-sourceTurnId="${el.sourceTurnId}"
            data-sourceMarker="${el.sourceMarker}"
            data-targetTurnId="${el.targetTurnId}"
            data-targetMarker="${el.targetMarker}"
        >
            <td>${quotesDictionary[el.sourceTurnId][el.sourceMarker]}</td>
            <td>${quotesDictionary[el.targetTurnId][el.targetMarker]}</td>
            <td>
                <button class="del-btn">Delete</button>
            </td>
        </tr>`;
            })
            .join('')}
        </tbody>
    </table>`);
}

$('.link-lines-info').on('click', '.del-btn', function () {
    const linkLineDetailsEl = $(this).parents('.link-line-details');
    const sourceTurnId = linkLineDetailsEl.attr('data-sourceTurnId');
    const sourceMarker = linkLineDetailsEl.attr('data-sourceMarker');
    const targetTurnId = linkLineDetailsEl.attr('data-targetTurnId');
    const targetMarker = linkLineDetailsEl.attr('data-targetMarker');
    lineInfoEls = lineInfoEls.filter((el) => {
        if (
            el.sourceTurnId != sourceTurnId ||
            el.sourceMarker != sourceMarker ||
            el.targetTurnId != targetTurnId ||
            el.targetMarker != targetMarker
        ) {
            return true;
        }
        return false;
    });
    saveLinesSettings(lineInfoEls);
    markYellowElementsWithRed(lineInfoEls);
    drawLinesByEls(lineInfoEls, frontLinesFlag);
    linkLineDetailsEl.remove();
});

// получение справочника авторов
setTimeout(() => {
    authorDictionary = {
        123: {
            _id: '123',
            name: 'Teacher',
        },
        2: {
            _id: '2',
            name: 'Student',
        },
    };
}, 500);

getTurns((data) => {
    // Запрашиваем ходы с сервера и размещаем их на доске игры
    gameTurns = data;
    quotesDictionary = {};

    for (let elem of data) {
        quotesDictionary[elem._id] = [];
        let newDiv = makeNewBoxMessage(
            {
                turn: elem,
                data: elem,
            },
            authorDictionary
            /*          elem.header,
                        elem.paragraph,
                        elem._id,
                        elem.x,
                        elem.y,
                        elem.height,
                        elem.width,
                        elem.scrollPosition
                        */
        );
        gameBox.appendChild(newDiv); // само добавление div-ов ходов

        newDiv.querySelector('.paragraphText').scrollTop = elem.scrollPosition;

        getYellowElements(elem._id).forEach((el, index) => {
            quotesDictionary[elem._id].push($(el).text().trim());

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
                    markYellowElementsWithRed(lineInfoEls);

                    newLineInfoEl = {
                        // reset
                        sourceTurnId: null,
                        sourceMarker: null,
                        targetTurnId: null,
                        targetMarker: null,
                    };
                    drawLinesByEls(lineInfoEls, frontLinesFlag);
                }

                const selectedQuote = lineInfoEls.filter((element) => {
                    return (
                        (element.sourceTurnId === elem._id &&
                            element.sourceMarker === index) ||
                        (element.targetTurnId === elem._id &&
                            element.targetMarker === index)
                    );
                });

                showLinesInfoPanel(
                    { turnId: elem._id, markerId: index },
                    selectedQuote
                );
            });
        });
    }
    $('.textBox').resizable();
    $('.textBox').draggable({
        stop: function (event, ui) {
            // saveFieldSettings({
            //     left: ui.position.left,
            //     top: ui.position.top,
            //     height: 1000,
            //     width: 1000,
            // })
            // game.recalculate();
            drawLinesByEls(lineInfoEls, frontLinesFlag);
        },
    });
    $('.paragraphText').scroll(function (e) {
        // определить скрытые маркеры
        drawLinesByEls(lineInfoEls, frontLinesFlag);
    });

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

    // @todo: Проверить, что массив lineInfoEls загружен
    drawLinesByEls(lineInfoEls, frontLinesFlag);
    markYellowElementsWithRed(lineInfoEls);

    // Проверка, все ли картинки загрузились, чтобы корректно отрисовать линии связей - №30
    const images = $('img');
    let counter = images.length;
    images.toArray().forEach((el) => {
        if ($(el).get(0).complete) {
            counter = counter - 1;
        } else {
            $(el).one('load', () => {
                counter = counter - 1;
                //      console.log(counter); // можно сделать Progress Bar
                if (counter === 0) {
                    drawLinesByEls(lineInfoEls, frontLinesFlag);
                }
            });
        }
    });
});

const selectChanged = () => {
    const pw = document.getElementById('params-wrapper');
    switch (document.getElementById('turn-type').value) {
        case 'picture': {
            pw.innerHTML =
                'Image URL: <input id="input-image-url" type="text" />';
            pw.style.display = 'block';
            break;
        }
        case 'video': {
            pw.innerHTML =
                'Video URL: <input id="input-video-url" type="text" />'; /* +
                            '<br>Begin time: <input id="input-video-begin-time" type="text" placeholder="0:00:00" onchange="inputTimeOnChange" />' +
                            '<br>End time: <input id="input-video-end-time" type="text" placeholder="0:00:00" onchange="inputTimeOnChange" />'
                            */
            pw.style.display = 'block';
            break;
        }
        default: {
            pw.style.display = 'none';
        }
    }
};

function drawLinesByEls(lineInfoEls, frontFlag = false) {
    // функция рисования красной линии логической связи из точки "А" в точку "Б"
    let linesStr = '';
    for (let lineInfo of lineInfoEls) {
        const sourceMarkerEl = getYellowElement(
            lineInfo.sourceTurnId,
            lineInfo.sourceMarker
        );
        if (!isMarkerVisible($(sourceMarkerEl))) {
            continue;
        }
        const targetMarkerEl = getYellowElement(
            lineInfo.targetTurnId,
            lineInfo.targetMarker
        );
        if (!isMarkerVisible($(targetMarkerEl))) {
            continue;
        }

        const sourceCoords = getMarkerCoords(
            lineInfo.sourceTurnId,
            lineInfo.sourceMarker
        );
        const targetCoords = getMarkerCoords(
            lineInfo.targetTurnId,
            lineInfo.targetMarker
        );
        const sideBarWidth = $('#classMenu').width(); // + 45;

        // фрагмент 3

        const sourceFirst = sourceCoords.left < targetCoords.left;
        const line = {
            x1:
                sourceCoords.left +
                (sourceFirst ? sourceCoords.width : 0) -
                sideBarWidth +
                (sourceFirst ? -4 : 4), // + 3,
            y1: sourceCoords.top + Math.floor(sourceCoords.height / 2),
            x2:
                targetCoords.left +
                (sourceFirst ? 0 : targetCoords.width) -
                sideBarWidth +
                (sourceFirst ? 4 : -4), // - 5,
            y2: targetCoords.top + Math.floor(targetCoords.height / 2),
        };
        // отрисовка координат
        linesStr += getLine(gameBox, line.x1, line.y1, line.x2, line.y2);
    }
    if ($('#lines').length) {
        $('#lines').remove();
    }
    const svg = $(`<svg viewBox="0 0 ${$('#gameBox').width()} ${$(
        '#gameBox'
    ).height()}" xmlns="http://www.w3.org/2000/svg" id="lines">
    ${linesStr}
  </svg>`);
    if (frontFlag) {
        svg.addClass('front-elements');
    }
    $(gameBox).append(svg);
}

function buttonSavePositions(e) {
    // функция сохранения поля
    // e.preventDefault();
    const textBoxes = document.querySelectorAll('.textBox');
    const payload = [];
    for (let textBox of textBoxes) {
        //console.log(textBox.children[0].innerText);
        const x = parseInt(textBox.style.left) || 0;
        const y = parseInt(textBox.style.top) || 0;
        const height = parseInt(textBox.style.height);
        const width = parseInt(textBox.style.width);
        const { id, contentType } = textBox.dataset;
        const scrollPosition = textBox.querySelector('.paragraphText')
            .scrollTop; // bug
        // console.log(scrollPosition);
        payload.push({ x, y, height, width, id, contentType, scrollPosition });
    }
    turnsUpdateCoordinates(payload, function () {
        console.log('Positions of all turns re-saved.');
    });
}

const getGame = (gameBox, fieldSettings) => {
    const render = () => {
        // инкапсуляция переменных
        gameBox.style.left = fieldSettings.left + 'px';
        gameBox.style.top = fieldSettings.top + 'px';
    };

    const recalculate = () => {
        // найти textboxes
        const textBoxElements = document.querySelectorAll('.textBox');
        const left = parseInt(gameBox.style.left);
        const top = parseInt(gameBox.style.top);
        // пересчитать настройки
        for (let textBoxElement of textBoxElements) {
            textBoxElement.style.left =
                parseInt(textBoxElement.style.left) + left + 'px';
            textBoxElement.style.top =
                parseInt(textBoxElement.style.top) + top + 'px';
        }
        gameBox.style.left = 0;
        gameBox.style.top = 0;
        saveFieldSettings({
            left: 0,
            top: 0,
        });
    };
    return {
        recalculate: recalculate, // возвращаем две верёвки методов, можем за них дёргать
        render: render,
    };
};

function isMarkerVisible(jqElement) {
    // элементы отбрасывают "тень", иметь ввиду для дальнейших видов контента!
    // if(jqElement.parents('[data-content-type="picture"]').length) {
    //     debugger;
    // }
    if (!jqElement.length) {
        console.log('Попытка обратиться к несуществующему jquery элементу');
        return false;
    }
    const top = jqElement.position()['top'];
    const height = jqElement.height();
    const paragraphHeight = jqElement.parents('.paragraphText').height();
    const headerHeight =
        jqElement.parents('.textBox').find('.headerText').height() || 0;
    const pictureHeight =
        jqElement.parents('.textBox').find('.picture-content').height() || 0;
    const iFrameHeight =
        jqElement.parents('.textBox').find('.video').height() || 0;

    if (top + height < headerHeight + pictureHeight + iFrameHeight) {
        return false;
    }
    if (top > headerHeight + paragraphHeight + pictureHeight + iFrameHeight) {
        return false;
    }
    return true;
}

// **** КЛИЕНТСКИЙ КОД  ****/

if (classesPanelSettings.visible) {
    $('#classMenu').removeClass('hidden');
}
const fieldSettings = getFieldSettings();
const game = getGame(gameBox, fieldSettings);
game.render();

$('#gameBox').draggable({
    stop: function (event, ui) {
        saveFieldSettings({
            left: ui.position.left,
            top: ui.position.top,
            height: 1000,
            width: 1000,
        });
        game.recalculate();
        drawLinesByEls(lineInfoEls, frontLinesFlag);
    },
});

$('#move-scroll-btn').click((e) => {
    toggleLinesZIndex(() => {
        frontLinesFlag = !frontLinesFlag;
    });
});
$('#toggle-left-panel').click((e) => {
    toggleLeftClassPanel(() => {
        classesPanelSettings.visible = !classesPanelSettings.visible;
        savePanelSettings(classesPanelSettings);
        drawLinesByEls(lineInfoEls, frontLinesFlag);
    });
});
$('#toggle-links-btn').click(toggleLinesVisibility);
$('#zoom-plus-btn').click(() => zoomInOut(1));
$('#zoom-minus-btn').click(() => zoomInOut(-1));
$('#add-new-class').click(addNewClass);
$('#save-positions-btn').click(buttonSavePositions);
$('#turn-type').change(selectChanged);

const popup = getPopup(); // @fixme передача body
$('#add-new-box-to-game-btn').click(popup.openModal); // addNewBoxToGame
// $('#cancel-turn-modal').click(cancelTurnModal);