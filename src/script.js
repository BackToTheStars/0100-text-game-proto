import { getRedLogicLines, saveTurn, deleteTurn, updateRedLogicLines } from './service';
// import { openTurnModal } from './modal';
import { getPopup } from './popup';
const popup = getPopup(document.body);

const getInputValue = (id) => {
    // обработчик поля Input
    let input = document.getElementById(id);
    let text = input.value;
    input.value = '';
    return text;
};

function addNewBoxToGame() {
    // вставляет новый блок источника на поле
    const header = getInputValue('headerText');
    const par = getInputValue('paragraphText'); // вводит текст параграфа
    const type = getInputValue('turn-type');
    //console.log(`turnType: ${type}`);
    const imageUrl =
        type === 'picture' ? getInputValue('input-image-url') : undefined;
    const videoUrl =
        type === 'video' ? getInputValue('input-video-url') : undefined;
    //console.log(`videoUrl: ${videoUrl}`);

    let newTurn = {
        header,
        paragraph: [{ insert: par }],
        contentType: type,
        height: 300,
        width: 400,
        imageUrl,
        videoUrl,
    };
    saveTurn(newTurn, (data) => {
        let newDiv = makeNewBoxMessage(
            {
                turn: newTurn,
                data,
            } /*header, par, data._id, data.x, data.y, data.height, data.width*/
        );
        gameBox.appendChild(newDiv); // добавляет новый div к заданному div
        $(newDiv).resizable({
            create: function (ev, ui) {
                //console.log('create')
            },
            resize: function (ev, ui) {
                //console.log(ui.element)
                //console.log(ui.originalElement)
            },
        });
        $(newDiv).draggable(); //{containment: "#gameBox"});
    });
}

function addTextToParagraph(par, text) {
    if (Array.isArray(text)) {
        par.innerHTML = '';
        const innerPar = document.createElement('p');
        // par.innerHTML = text.map((el) => `<span>${el.insert}</span>`).join("");
        for (let textItem of text) {
            const spanEl = document.createElement('span');
            if (textItem.attributes) {
                for (let property of Object.keys(textItem.attributes)) {
                    spanEl.style[property] = textItem.attributes[property];
                }
            }
            spanEl.innerText = textItem.insert;
            innerPar.appendChild(spanEl);
        }
        par.appendChild(innerPar);
    } else {
        par.innerHTML = text;
    }
    return par;
}

function makeParagraph(text) {
    // создать <p> класса "paragraphText" и записать в него параграф
    let par = document.createElement('p');
    par.className = 'paragraphText';
    return addTextToParagraph(par, text);
}

function makeHead(text) {
    // создать <h5> класса "headerText" и записать в него заголовок
    let h = document.createElement('h5');
    h.className = 'headerText';
    h.innerHTML = text;
    return h;
}

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

function makeDeleteButton(turn) {
    // создать кнопку "Delete turn"    // refactor with makeEditButton()
    let button = document.createElement('button');
    button.innerHTML = 'Delete';
    button.addEventListener('click', () => {
        if (confirm('Точно удалить?')) {
            deleteTurn(turn);
            const element = document.querySelector(`[data-id = "${turn._id}"]`);
            element.remove();
        }
    });
    return button;
}

const makeNewBoxMessage = (obj, authorDictionary = {}) => {
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
    // let param = {
    //     head: header,
    //     par: paragraph,
    // };
    const authorObj = authorDictionary[author_id];
    // создаёт div блока по заданным параметрам
    const elmnt = document.createElement('div');
    elmnt.dataset.id = _id; // data attribute для div-a
    elmnt.style.left = `${x}px`;
    elmnt.style.top = `${y}px`;
    elmnt.style.height = `${height}px`;
    elmnt.style.width = `${width}px`;
    elmnt.className = 'textBox ui-widget-content';
    // console.log(paragraph);
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
            const img = document.createElement('img');
            img.classList.add('picture-content');
            //img.dataset.imgUrl = imageUrl;
            //img.style.background = `center / contain no-repeat url("${imageUrl}")`;
            img.style.background = '#000';
            img.style.width = "100%";
            img.src = imageUrl;
            //img.scale = '1';
            wrapper.appendChild(img);
            wrapper.appendChild(p);
            elmnt.appendChild(wrapper);
            elmnt.onresize = function (ev) {
                //console.log(ev.target);
                const cs = window.getComputedStyle(ev.target);
                const h = cs.height.slice(0, -2);
                const w = cs.width.slice(0, -2);
                //console.log(h, w);
                const img = ev.target.children[3].children[0];
                console.log(img.naturalWidth, img.naturalHeight);
                const ih = img.naturalHeight;
                const iw = img.naturalWidth;
                img.style.height = `${Math.min(
                    h * 0.9,
                    (w * ih) / iw
                )}px`;
            };
            // removed fragment 2 to fragments.js
            break;
        }
        case 'video': {
            //<iframe width="1280" height="720" src="https://www.youtube.com/embed/inBKFMB-yPg" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

            const frame = document.createElement('iframe');
            frame.classList.add('video');
            // debugger

            const m = videoUrl.match(/watch\?v=/);
            if (m) {
                //console.log('match')
                frame.src = `${videoUrl.substring(
                    0,
                    m.index
                )}embed/${videoUrl.substring(m.index + 8)}`;
            } else {
                // console.log('not match')
                frame.src = videoUrl;
            }
            //frame.style.maxHeight = '100%';
            //frame.style.maxWidth = '100%';
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

    /* здесь был "Фрагмент 1", сохранён в файле "фрагменты.js" */

    return elmnt;
};

function addNewClass() {
    // создаёт поле нового класса, напр. "PERSON"
    let newClassName = getInputValue('newClassName');
    let newClassDiv = createClassField(newClassName);
    insertNewClass(newClassDiv);
};

function createClassField(name) {
    let uniqueInputId = 'classInput' + name;
    let uniqueUlId = 'classUl' + name;
    let div = document.createElement('div');
    div.className = 'class-list col-12';
    div.innerHTML = `<div class="title">${name}</div>
    <div id="${uniqueUlId}"></div><!--ul-->
    <input id="${uniqueInputId}" class="col-12">
    <button class="add-element">Add</button>`;
    div.querySelector('.add-element').addEventListener('click', (e) => {
        insertNewClassElement(
            div.querySelector(`#${uniqueInputId}`),
            div.querySelector(`#${uniqueUlId}`)
        );
    });
    return div;
}

function insertNewClass(childClass) {
    let parent = document.getElementById('classMenu');
    parent.appendChild(childClass);
}

function insertNewClassElement(input, ul) {
    let value = input.value;
    input.value = '';
    let li = document.createElement('div'); //li
    li.className = 'el';
    li.innerHTML = value;
    ul.appendChild(li);
}

const saveFieldSettings = (settings) => {
    // left, top,
    // width, height
    localStorage.setItem('gameField', JSON.stringify(settings));
};

const getFieldSettings = () => {
    const settings = JSON.parse(localStorage.getItem('gameField')) || {
        left: 0,
        top: 0,
        width: 1000,
        height: 1000,
    };
    return settings;
};

const savePanelSettings = (panelSettings) => {
    localStorage.setItem('classesPanel', JSON.stringify(panelSettings));
};
const getPanelSettings = () => {
    const panelSettings = JSON.parse(localStorage.getItem('classesPanel')) || {
        visible: false,
    };
    return panelSettings;
};

const saveLinesSettings = (lineInfoEls) => {
    // сохраняет lineInfoEls в память браузера
    // localStorage.setItem('linkLines', JSON.stringify(lineInfoEls));
    updateRedLogicLines(lineInfoEls, function () {
        //console.log("updateRedLogicLines")
    });
};

const getLinesSettings = (callback) => {
    getRedLogicLines(callback);
    // const lineInfoEls = JSON.parse(localStorage.getItem('linkLines')) || [];
    // return lineInfoEls;
};

export {
    getInputValue,
    addNewBoxToGame,
    addTextToParagraph,
    makeParagraph,
    makeHead,
    makeEditButton,
    makeDeleteButton,
    makeNewBoxMessage,
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
};
