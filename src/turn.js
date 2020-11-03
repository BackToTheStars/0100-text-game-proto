import {
  getInputValue,
  addTextToParagraph,
  makeParagraph,
  makeHead,
  makeEditButton,
  makeDeleteButton,
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
    const qs = newDiv.querySelector('.paragraphText');
    if (qs) {
        qs.scrollTop = elem.scrollPosition;
    };

// --------------- МЕТОДЫ ------------------------------------------
    
    function makeEditButton(turn) {
        // создать кнопку "Edit turn"
        let button = document.createElement('button');
        button.innerHTML = 'Edit';
        button.addEventListener('click', () => {
            // popup
            popup.openModal();
            popup.setTurn(turn);
            // openTurnModal(turn);
        });
        return button;
    }
  
    function makeNewBoxMessage(obj, authorDictionary = {}) {
        //console.log(`${JSON.stringify(obj)}`);
        const {
            paragraph,
            height,
            width,
            contentType,
            imageUrl,
            videoUrl,
            author_id,
            sourceUrl,
            date,
        } = obj.turn; // деструктуризатор для хода
        let { header } = obj.turn;
        const { _id, x, y } = obj.data;

        const authorObj = authorDictionary[author_id];
        // создаёт div блока по заданным параметрам
        const elmnt = document.createElement('div');
        elmnt.dataset.id = _id; // data attribute для div-a
        elmnt.style.left = `${x}px`;
        elmnt.style.top = `${y}px`;
        elmnt.style.height = `${height}px`;
        elmnt.style.width = `${width}px`;
        elmnt.className = 'textBox ui-widget-content';
        const p = makeParagraph(paragraph);
        //p.style.bottom = '100%';
        //p.style.position = 'absolute';

        if (contentType === 'comment' && authorObj) {
            // если комментарий, то добавляем автора в header
            header = authorObj.name + ':';
        }
        const h = makeHead(header);
        // const editButton = makeEditButton({ _id, paragraph: paragraph, header: header });
        const editButton = makeEditButton(obj.turn);
        const deleteButton = makeDeleteButton({
            _id,
            paragraph: paragraph,
            header: header,
        });
        h.appendChild(editButton);
        h.appendChild(deleteButton);

        elmnt.appendChild(h);

        elmnt.dataset.contentType = contentType; // data attribute для div-a
        // const bottom
        if (sourceUrl) {
            const leftBottomEl = document.createElement('div');
            leftBottomEl.classList.add('left-bottom-label');
            leftBottomEl.innerText = sourceUrl;
            elmnt.appendChild(leftBottomEl);
        }

        if (date) {
            const rightBottomEl = document.createElement('div');
            rightBottomEl.classList.add('right-bottom-label');
            rightBottomEl.innerText = new Date(date).toLocaleDateString();
            elmnt.appendChild(rightBottomEl);
        }

        const wrapper = document.createElement('div');
        wrapper.style.display = '#flex';
        wrapper.style.flexDirection = 'column'; // соглашение, что camelCase = camel-case
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'space-between';
        wrapper.style.height = '100%';
        wrapper.style.width = '100%';

        switch (contentType) {
            case 'picture': {
                if (imageUrl && imageUrl.trim()) {
                    const img = document.createElement('img');
                    img.classList.add('picture-content');
                    img.style.background = '#000';
                    img.style.width = "100%";
                    img.src = imageUrl;
                    let max_height_factor = 0.9;
                    wrapper.appendChild(img);
                    if (paragraph && !(paragraph.length == 1 && paragraph[0].insert.trim() == '')) {
                        wrapper.appendChild(p);
                    } else {
                        max_height_factor = 1;
                    }
                    elmnt.appendChild(wrapper);
                    elmnt.onresize = function (ev) {
                        const cs = window.getComputedStyle(ev.target);
                        const h = cs.height.slice(0, -2);
                        const w = cs.width.slice(0, -2);
                        const img = ev.target.children[3].children[0];
                        const ih = img.naturalHeight;
                        const iw = img.naturalWidth;
                        const th = Math.min(h * max_height_factor, (w * ih) / iw);
                        const tw = Math.min(w, th * iw / ih);
                        ev.target.style.height = `${th}px`;
                        ev.target.style.width = `${tw}px`;
                    };
                } else {
                    elmnt.appendChild(p);
                }
                // removed fragment 2 to fragments.js
                break;
            }
            case 'video': {
                const frame = document.createElement('iframe');
                frame.classList.add('video');

                const m = videoUrl.match(/watch\?v=/);
                if (m) {
                    frame.src = `${videoUrl.substring(
                        0,
                        m.index
                    )}embed/${videoUrl.substring(m.index + 8)}`;
                } else {
                    frame.src = videoUrl;
                }
                frame.style.width = '100%';
                frame.style.height = '90%';
                frame.style.top = '0';
                frame.style.left = '0';
                frame.frameborder = '0';
                frame.allow =
                    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                frame.allowfullscreen = true;
                wrapper.appendChild(frame);
                wrapper.appendChild(p);
                elmnt.appendChild(wrapper);
                elmnt.onresize = function (ev) {
                    // отвечает за корректный масштаб видео от ширины блока
                    // console.log(window.getComputedStyle(ev.target).height);
                    // console.log(ev.target.children);
                    const cs = window.getComputedStyle(ev.target);
                    const h = cs.height.slice(0, -2);
                    const w = cs.width.slice(0, -2);
                    //console.log(h, w);
                    ev.target.children[3].children[0].style.height = `${Math.min(
                        h * 0.9,
                        (w * 9) / 16
                    )}px`;
                };
                break;
            }
            case 'comment': {
                elmnt.classList.add('comment');
                wrapper.appendChild(p);
                elmnt.appendChild(wrapper);
                break;
            }

            default: {
                wrapper.appendChild(p);
                elmnt.appendChild(wrapper);
            }
        }

        //* здесь был "Фрагмент 1"

        return elmnt;
    };

    // -----------------------  ПРИВЯЗКА СОБЫТИЙ ---------------------------


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