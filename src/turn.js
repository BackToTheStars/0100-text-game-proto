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

const getTurn = (elem, gameParams) => {
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
    
    gameBox.appendChild(el); // само добавление div-ов ходов
    const qs = el.querySelector('.paragraphText');
    if (qs) {
        qs.scrollTop = elem.scrollPosition;
    };

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
        popup.openModal();
        popup.setTurn(turn);
    };
  
    // function makeNewBoxMessage(obj) {
    //     // const {
    //     //     paragraph,
    //     //     height,
    //     //     width,
    //     //     contentType,
    //     //     imageUrl,
    //     //     videoUrl,
    //     //     author_id,
    //     //     sourceUrl,
    //     //     date,
    //     //     _id,
    //     //     x,
    //     //     y
    //     // } = obj; // деструктуризатор для хода
    //     // let { header } = obj;

    //     // const authorObj = authorDictionary[author_id];
    //     // создаёт div блока по заданным параметрам
    //     // const elmnt = document.createElement('div');



    //     // elmnt.dataset.id = _id; // data attribute для div-a
    //     // elmnt.style.left = `${x}px`;
    //     // elmnt.style.top = `${y}px`;
    //     // elmnt.style.height = `${height}px`;
    //     // elmnt.style.width = `${width}px`;
    //     // elmnt.className = 'textBox ui-widget-content';
    //     // const p = makeParagraph(paragraph);

    //     // if (contentType === 'comment' && authorObj) {
    //     //     // если комментарий, то добавляем автора в header
    //     //     header = authorObj.name + ':';
    //     // }
    //     // const h = makeHead(header);
    //     // const editButton = makeEditButton({ _id, paragraph: paragraph, header: header });
    //     // const editButton = makeEditButton(obj.turn);
    //     // const deleteButton = makeDeleteButton({
    //     //     _id,
    //     //     paragraph: paragraph,
    //     //     header: header,
    //     // });
    //     // h.appendChild(editButton);
    //     // h.appendChild(deleteButton);

    //     // elmnt.appendChild(h);

    //     // elmnt.dataset.contentType = contentType; // data attribute для div-a
    //     // const bottom
    //     // if (sourceUrl) {
    //     //     const leftBottomEl = document.createElement('div');
    //     //     leftBottomEl.classList.add('left-bottom-label');
    //     //     leftBottomEl.innerText = sourceUrl;
    //     //     elmnt.appendChild(leftBottomEl);
    //     // }

    //     // if (date) {
    //     //     const rightBottomEl = document.createElement('div');
    //     //     rightBottomEl.classList.add('right-bottom-label');
    //     //     rightBottomEl.innerText = new Date(date).toLocaleDateString();
    //     //     elmnt.appendChild(rightBottomEl);
    //     // }

    //     // const wrapper = document.createElement('div');
    //     // wrapper.style.display = '#flex';
    //     // wrapper.style.flexDirection = 'column'; // соглашение, что camelCase = camel-case
    //     // wrapper.style.alignItems = 'center';
    //     // wrapper.style.justifyContent = 'space-between';
    //     // wrapper.style.height = '100%';
    //     // wrapper.style.width = '100%';

    //     switch (contentType) {
    //         case 'picture': {
    //             // if (imageUrl && imageUrl.trim()) {
    //             //     const img = document.createElement('img');
    //             //     img.classList.add('picture-content');
    //             //     img.style.background = '#000';
    //             //     img.style.width = "100%";
    //             //     img.src = imageUrl;
    //             //     let max_height_factor = 0.9;
    //             //     wrapper.appendChild(img);
    //             //     if (paragraph && !(paragraph.length == 1 && paragraph[0].insert.trim() == '')) {
    //             //         wrapper.appendChild(p);
    //             //     } else {
    //             //         max_height_factor = 1;
    //             //     }
    //             //     elmnt.appendChild(wrapper);
    //             //     elmnt.onresize = function (ev) {
    //             //         const cs = window.getComputedStyle(ev.target);
    //             //         const h = cs.height.slice(0, -2);
    //             //         const w = cs.width.slice(0, -2);
    //             //         const img = ev.target.children[3].children[0];
    //             //         const ih = img.naturalHeight;
    //             //         const iw = img.naturalWidth;
    //             //         const th = Math.min(h * max_height_factor, (w * ih) / iw);
    //             //         const tw = Math.min(w, th * iw / ih);
    //             //         ev.target.style.height = `${th}px`;
    //             //         ev.target.style.width = `${tw}px`;
    //             //     };
    //             // } else {
    //             //     elmnt.appendChild(p);
    //             // }
    //             // removed fragment 2 to fragments.js
    //             break;
    //         }
    //         case 'video': {
    //             // const frame = document.createElement('iframe');
    //             // frame.classList.add('video');

    //             // const m = videoUrl.match(/watch\?v=/);
    //             // if (m) {
    //             //     frame.src = `${videoUrl.substring(
    //             //         0,
    //             //         m.index
    //             //     )}embed/${videoUrl.substring(m.index + 8)}`;
    //             // } else {
    //             //     frame.src = videoUrl;
    //             // }
    //             // frame.style.width = '100%';
    //             // frame.style.height = '90%';
    //             // frame.style.top = '0';
    //             // frame.style.left = '0';
    //             // frame.frameborder = '0';
    //             // frame.allow =
    //             //     'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    //             // frame.allowfullscreen = true;
    //             // wrapper.appendChild(frame);
    //             // wrapper.appendChild(p);
    //             // elmnt.appendChild(wrapper);
    //             // elmnt.onresize = function (ev) {
    //             //     // отвечает за корректный масштаб видео от ширины блока
    //             //     const cs = window.getComputedStyle(ev.target);
    //             //     const h = cs.height.slice(0, -2);
    //             //     const w = cs.width.slice(0, -2);
    //             //     ev.target.children[3].children[0].style.height = `${Math.min(
    //             //         h * 0.9,
    //             //         (w * 9) / 16
    //             //     )}px`;
    //             // };
    //             // break;
    //         }
    //         case 'comment': {
    //             // elmnt.classList.add('comment');
    //             // wrapper.appendChild(p);
    //             // elmnt.appendChild(wrapper);
    //             // break;
    //         }

    //         default: {
    //             // wrapper.appendChild(p);
    //             // elmnt.appendChild(wrapper);
    //         }
    //     }

    //     //* здесь был "Фрагмент 1"

    //     return elmnt;
    // };

    // // function makeEditButton(turn) {
    // //     // создать кнопку "Edit turn"
    // //     let button = document.createElement('button');
    // //     button.innerHTML = 'Edit';
    // //     button.addEventListener('click', () => {
    // //         // popup
    // //         popup.openModal();
    // //         popup.setTurn(turn);
    // //         // openTurnModal(turn);
    // //     });
    // //     return button;
    // // }

    // -----------------------  ПРИВЯЗКА СОБЫТИЙ ---------------------------
    deleteBtn.addEventListener('click', deleteButtonHandler);

    el.onresize = function (ev) { // @todo: remove
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
        // // ev.target.children[3].children[0];


        // // отвечает за корректный масштаб видео от ширины блока
        // if(videoEl) {
        //     ev.target.children[3].children[0].style.height = `${Math.min(
        //         h * 0.9,
        //         (w * 9) / 16
        //     )}px`;
        // }

        // получить высоту el, вычесть высоту header, сохранить в media wrapper
        $(mediaWrapperEl).height($(el).height() - $(headerEl).height())
    };

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
}

export {
    getTurn
}