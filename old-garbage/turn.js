import {
  getInputValue,
  addTextToParagraph,
  makeParagraph,
  makeHead,
  addNewClass,
  createClassField,
  insertNewClass,
  insertNewClassElement,
  saveFieldSettings,
  getFieldSettings,
  savePanelSettings,
  getPanelSettings,
  saveLinesSettings,
  getLinesSettings,
} from './script'

const getParagraphText = (arrText) => { // @todo: remove
    const el = document.createElement('p');
    for (let textItem of arrText) {
        const spanEl = document.createElement('span');
        if (textItem.attributes) {
            for (let property of Object.keys(textItem.attributes)) {
                spanEl.style[property] = textItem.attributes[property];
            }
        }
        spanEl.innerText = textItem.insert;
        el.appendChild(spanEl);
    }
    return el.innerHTML;
}

const getYoutubeId = (address) => {
    return address.slice(address.lastIndexOf('?v=') + 3);
}

const getTurn = (elem, gameParams, game) => {
    const turnModel = {
        data: elem
    }
    const {
        popup,
        gameBox,
        quotesDictionary,
        authorDictionary,
        lineInfoEls,
        saveLinesSettings,
        getYellowElements,
        markYellowElementsWithRed,
        drawLinesByEls,
        showLinesInfoPanel
    } = gameParams

    // --------------------  ПЕРЕМЕННЫЕ И ИНИЦИАЛИЗАЦИЯ ---------------------------
    const {
        header,
        paragraph,
        height,
        width,
        contentType,
        imageUrl,
        videoUrl,
        author_id,
        sourceUrl,
        date,
        _id,
        x,
        y
    } = elem;

    quotesDictionary[elem._id] = [];
    const authorObj = authorDictionary[author_id];
    let el = document.createElement('div');
    drawTurn();
    const editBtn = el.querySelector('.edit-btn');
    const deleteBtn = el.querySelector('.delete-btn')
    // media-wrapper
    const mediaWrapperEl = el.querySelector('.media-wrapper');
    // headerText
    const headerEl = el.querySelector('.headerText');
    const videoEl = el.querySelector('.video')
    const imgEl = el.querySelector('.picture-content')
    
    gameBox.appendChild(el); // само добавление div-ов ходов
    const qs = el.querySelector('.paragraphText');
    if (qs) {
        qs.scrollTop = elem.scrollPosition;
    };

    handleResize();

// --------------- МЕТОДЫ ------------------------------------------
    function drawTurn() {
        el.dataset.id = _id; // data attribute для div-a
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.height = `${height}px`;
        el.style.width = `${width}px`;
        el.className = `textBox ui-widget-content ${contentType}-type`;
        el.dataset.contentType = contentType;

        let headerText = '';
        if(contentType === 'comment' && authorObj && authorObj.name) {
            headerText = authorObj.name + ': ';
        }
        //data-content-type="picture"
        el.innerHTML = `<h5 class="headerText">
            ${headerText}${header}
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
        </h5>
        ${sourceUrl ? `<div class="left-bottom-label">${sourceUrl}</div>` : ''}
        ${date ? `<div class="right-bottom-label">${date}</div>` : ''}
        <div
            class="media-wrapper"
            style="display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 100%; width: 100%;">

            ${(videoUrl && videoUrl.trim()) ? `<iframe
                class="video"
                src="https://www.youtube.com/embed/${getYoutubeId(videoUrl)}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                style="width: 100%; height: 90%; top: 0px; left: 0px;">
            </iframe>` : ''}
            
            ${(imageUrl && imageUrl.trim()) ? `<img class="picture-content" src="${imageUrl}"
                style="background: rgb(0, 0, 0); width: 100%;">`: ''}  
            
            <p class="paragraphText">
                ${getParagraphText(paragraph || [])}
            </p>
        </div>`
        gameBox.appendChild(el);
    }

    const deleteButtonHandler = () => {
        if (confirm('Точно удалить?')) {
            // @todo: удалить привязки и линии связи
            deleteTurn(obj);
            el.remove();
        }
    };

    const editButtonHandler = () => {
        game.popup.openModal();
        game.popup.setTurn(turnModel);
    };

    function handleResize () {
        if(imgEl) {
            const ih = imgEl.naturalHeight;
            const iw = imgEl.naturalWidth;

            $(imgEl).width($(el).width());
            $(imgEl).height(Math.floor(imgEl.naturalHeight * $(el).width() / imgEl.naturalWidth));
        }

        // const max_height_factor = 1;

        // const cs = window.getComputedStyle(ev.target);
        // const h = cs.height.slice(0, -2);
        // const w = cs.width.slice(0, -2);
        // const img = el.querySelector('.picture-content')
        // if(img) {
        //     // return;
        //     const ih = img.naturalHeight;
        //     const iw = img.naturalWidth;
        //     const th = Math.min(h * max_height_factor, (w * ih) / iw);
        //     const tw = Math.min(w, th * iw / ih);
        //     ev.target.style.height = `${th}px`;
        //     ev.target.style.width = `${tw}px`;
        // }

        // ev.target.children[3].children[0];


        // // отвечает за корректный масштаб видео от ширины блока
        // if(videoEl) {
        //     ev.target.children[3].children[0].style.height = `${Math.min(
        //         h * 0.9,
        //         (w * 9) / 16
        //     )}px`;
        // }

        // получить высоту el, вычесть высоту header, сохранить в media wrapper
        $(mediaWrapperEl).height($(el).height() - $(headerEl).height())
    }

    const reCreate = () => {
        // @todo: removeEventListeners
        el.remove();
        return getTurn(turnModel.data, gameParams, game);
    }

    // Фрагмент 7 перемещён

    // -----------------------  ПРИВЯЗКА СОБЫТИЙ ---------------------------
    deleteBtn.addEventListener('click', deleteButtonHandler);
    editBtn.addEventListener('click', editButtonHandler);

    el.onresize = handleResize;

    $(el).resizable()
    $(el).draggable({
        stop: function (event, ui) {
            drawLinesByEls(lineInfoEls, true); // @todo check frontLinesFlag);
        },
    });
    $(qs).scroll(function (e) {
        // определить скрытые маркеры
        drawLinesByEls(lineInfoElss, true); // @todo check frontLinesFlag);
    });

    // @todo: move
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

    turnModel.reCreate = reCreate;
    return turnModel
}

export {
    getTurn
}