function getInputValue(id) {
    // обработчик поля Input
    let input = document.getElementById(id);
    let text = input.value;
    input.value = "";
    return text;
}

function addNewBoxToGame() {
    // вставляет новый блок источника на поле
    const header = getInputValue("headerText");
    const par = getInputValue("paragraphText"); // вводит текст параграфа
    const type = getInputValue("turnType");
    console.log(`turnType: ${type}`);
    const imageUrl = type === 'picture' ? getInputValue("input-image-url") : undefined;
    const videoUrl = type === 'video' ? getInputValue('input-video-url') : undefined;
    console.log(`videoUrl: ${videoUrl}`);

    let newTurn = {
        header,
        paragraph: [{ insert: par }],
        contentType: type,
        height: 300,
        width: 400,
        imageUrl,
        videoUrl
    };
    saveTurn(newTurn, (data) => {
        let newDiv = makeNewBoxMessage({ turn: newTurn, data }/*header, par, data._id, data.x, data.y, data.height, data.width*/);
        gameBox.appendChild(newDiv); // добавляет новый div к заданному div
        $(newDiv).resizable({
            create: function (ev, ui) {
                console.log('create')
            },
            resize: function (ev, ui) {
                console.log(ui.element)
                console.log(ui.originalElement)
            }
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
            const spanEl = document.createElement("span");
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

function makeParagraph(text) {  // создать <p> класса "paragraphText" и записать в него параграф
    let par = document.createElement("p");
    par.className = "paragraphText";
    return addTextToParagraph(par, text);
}

function makeHead(text) {       // создать <h5> класса "headerText" и записать в него заголовок 
    let h = document.createElement("h5");
    h.className = "headerText";
    h.innerHTML = text;
    return h;
}

function makeEditButton(turn) {                      // создать кнопку "Edit turn"
    let button = document.createElement("button");
    button.innerHTML = "Edit";
    button.addEventListener("click", () => {
        openTurnModal(turn);
    });
    return button;
}

function makeDeleteButton(turn) {   // создать кнопку "Delete turn"    // refactor with makeEditButton()
    let button = document.createElement('button');
    button.innerHTML = 'Delete';
    button.addEventListener('click', () => {
        deleteTurn(turn);
        const element = document.querySelector(`[data-id = "${turn._id}"]`);
        element.remove();
    });
    return button;
}


function makeNewBoxMessage(obj) {
    //console.log(`${JSON.stringify(obj)}`);
    const { paragraph, height, width, contentType, imageUrl, videoUrl, author_id } = obj.turn;   // деструктуризатор для хода
    let { header } = obj.turn;
    const { _id, x, y } = obj.data;
    // let param = {
    //     head: header,
    //     par: paragraph,
    // };
    const authorObj = authorDictionary[author_id];
    // создаёт div блока по заданным параметрам
    const elmnt = document.createElement('div');
    elmnt.dataset.id = _id;          // data attribute для div-a
    elmnt.style.left = `${x}px`;
    elmnt.style.top = `${y}px`;
    elmnt.style.height = `${height}px`;
    elmnt.style.width = `${width}px`;
    elmnt.className = 'textBox ui-widget-content';
    // console.log(paragraph);
    const p = makeParagraph(paragraph);
    //p.style.bottom = '100%';
    //p.style.position = 'absolute';

    if (contentType === "comment") { // если комментарий, то добавляем автора в header
        header = authorObj.name + ":";
    }
    const h = makeHead(header);
    const editButton = makeEditButton({ _id, paragraph: paragraph, header: header });
    const deleteButton = makeDeleteButton({ _id, paragraph: paragraph, header: header });
    h.appendChild(editButton);
    h.appendChild(deleteButton);

    elmnt.appendChild(h);


    elmnt.dataset.contentType = contentType; // data attribute для div-a

    switch (contentType) {
        case 'picture': {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';   // соглашение, что camelCase = camel-case
            wrapper.style.alignItems = 'center';
            wrapper.style.justifyContent = 'space-between';
            wrapper.style.height = '100%';
            wrapper.style.width = '100%';
            const img = document.createElement('img');
            img.classList.add('picture-content');
            img.dataset.imgUrl = imageUrl;
            img.style.background = `center / contain no-repeat url("${imageUrl}")`;
            img.src = imageUrl;
            wrapper.appendChild(img);
            wrapper.appendChild(p);
            elmnt.appendChild(wrapper);
            // elmnt.onresize = function(ev) {             // глючит
            //     const cs = window.getComputedStyle(ev.target);
            //     const h = cs.height.slice(0, -2);
            //     const w = cs.width.slice(0, -2);
            //     const img = ev.target.children[1].children[0];
            //     const nh = img.naturalHeight;
            //     const nw = img.naturalWidth;
            //     console.log(nh, nw);
            //     const ratio = nh/nw;
            //     if (h/w > ratio) {
            //         console.log(1, nh, nw);
            //         img.style.height = w*nh/nw;
            //         img.style.width = w;
            //     } else {
            //         console.log(2, h/w, ratio, h, w, nh, nw);
            //         img.style.height = h;
            //         img.style.width = h*nw/nh;
            //     }
            // }
            break;
        }
        case 'video': {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';   // соглашение, что camelCase = camel-case
            wrapper.style.alignItems = 'center';
            wrapper.style.justifyContent = 'space-between';
            wrapper.style.height = '100%';
            wrapper.style.width = '100%';

            //<iframe width="1280" height="720" src="https://www.youtube.com/embed/inBKFMB-yPg" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

            const frame = document.createElement('iframe');
            frame.classList.add("video");
            const m = videoUrl.match(/watch\?v=/)
            if (m) {
                console.log('match')
                frame.src = `${videoUrl.substring(0, m.index)}embed/${videoUrl.substring(m.index + 8)}`
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
            frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            frame.allowfullscreen = true;
            wrapper.appendChild(frame);
            wrapper.appendChild(p);
            elmnt.appendChild(wrapper);
            elmnt.onresize = function (ev) {  // отвечает за корректный масштаб видео от ширины блока
                // console.log(window.getComputedStyle(ev.target).height);
                // console.log(ev.target.children);
                const cs = window.getComputedStyle(ev.target);
                const h = cs.height.slice(0, -2);
                const w = cs.width.slice(0, -2);
                //console.log(h, w);
                ev.target.children[1].children[0].style.height = `${Math.min(h * 0.9, w * 9 / 16)}px`;
            }
            break;
        }
        case 'comment': {
            elmnt.classList.add('comment');
            elmnt.appendChild(p);
            break;
        }

        default: {
            elmnt.appendChild(p);
        }
    }

    /* здесь был "Фрагмент 1", сохранён в файле "фрагменты.js" */

    return elmnt;
}

function addNewClass() {
    // создаёт поле нового класса, напр. "PERSON"
    let newClassName = getInputValue("newClassName");
    let newClassDiv = createClassField(newClassName);
    insertNewClass(newClassDiv);
}

function createClassField(name) {
    let uniqueInputId = "classInput" + name;
    let uniqueUlId = "classUl" + name;
    let div = document.createElement("div");
    div.className = "row";
    div.innerHTML =
        "<h5>" +
        name +
        "</h5>" +
        "<ul id='" +
        uniqueUlId +
        "'></ul>" +
        "<input id='" +
        uniqueInputId +
        "'> " +
        "<button onclick='insertNewClassElement(" +
        uniqueInputId +
        "," +
        uniqueUlId +
        ")'>Add Element</button>";
    return div;
}

function insertNewClass(childClass) {
    let parent = document.getElementById("classMenu");
    parent.appendChild(childClass);
}

function insertNewClassElement(input, ul) {
    let value = input.value;
    input.value = "";
    let li = document.createElement("li");
    li.innerHTML = value;
    ul.appendChild(li);
}

const saveFieldSettings = (settings) => {
    // left, top,
    // width, height
    localStorage.setItem('gameField', JSON.stringify(settings))
}

const getFieldSettings = () => {
    const settings = JSON.parse(localStorage.getItem('gameField')) || {
        left: 0,
        top: 0,
        width: 1000,
        height: 1000
    }
    return settings;
}

const savePanelSettings = (panelSettings) => {
    localStorage.setItem('classesPanel', JSON.stringify(panelSettings))
}
const getPanelSettings = () => {
    const panelSettings = JSON.parse(localStorage.getItem('classesPanel')) || { visible: false };
    return panelSettings;
}

const saveLinesSettings = (lineInfoEls) => { // сохраняет lineInfoEls в память браузера
    // localStorage.setItem('linkLines', JSON.stringify(lineInfoEls));
    updateRedLogicLines(lineInfoEls, function () {
        console.log("updateRedLogicLines")
    })
}

const getLinesSettings = (callback) => {
    getRedLogicLines(callback)
    // const lineInfoEls = JSON.parse(localStorage.getItem('linkLines')) || [];
    // return lineInfoEls;
}



