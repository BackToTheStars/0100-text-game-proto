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
            if (imageUrl && imageUrl.trim()) {
                const img = document.createElement('img');
                img.classList.add('picture-content');
                //img.dataset.imgUrl = imageUrl;
                //img.style.background = `center / contain no-repeat url("${imageUrl}")`;
                img.style.background = '#000';
                img.style.width = "100%";
                img.src = imageUrl;
                //img.scale = '1';
                let max_height_factor = 0.9;
                wrapper.appendChild(img);
                if (paragraph && !(paragraph.length == 1 && paragraph[0].insert.trim() == '')) {
                    wrapper.appendChild(p);
                    // console.log(`${header}: set max_height_factor = ${max_height_factor}`);
                } else {
                    max_height_factor = 1;
                    // console.log(`${header}: set max_height_factor = ${max_height_factor}`);
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

    /* здесь был "Фрагмент 1", сохранён в файле "фрагменты.js" */

    return elmnt;
};

class GameClass {
    constructor(obj) {
        const { panel, name, rootToAppend, subClasses, dbId, sync } = obj;
        this.panel = panel;
        this.name = name;
        this.dbId = dbId;
        this.rootToAppend = rootToAppend;
        this.subClassNames = subClasses;
        this.sync = sync;                   // говорит что этот класс нужно отправить на сервер
        //console.log(`GameClass: constructor: obj = ${JSON.stringify(obj)}`);
        if (sync) {
            const body = {
                gameClass: name
            };
            const bodyJSON = JSON.stringify(body);
            fetch('/gameClass', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': bodyJSON.length
                },
                body: bodyJSON
            })
                .then((res) => {
                    res.json()
                        .then((json) => {
                            const { _id } = json;
                            console.log(_id)
                            this.dbId = _id;
                            this.prerender()
                                .then(() => {
                                    this.render();
                                });
                        }, (err) => {
                            console.log(`ERROR: GameClass: construtor: fetch: not JSON: ${err}`);
                        });
                }, (err) => {
                    console.log(`ERROR: ${bodyJSON}: sending failed`);
                })
        } else {
            this.prerender()
                .then(() => {
                    this.render()
                        .then(() => {
                            this.subClassNames.forEach((name) => { this.renderSubclass({ subClassName: name }) });
                        });
                })
        }
    }

    async prerender() {
        this.self = document.createElement('div');
        this.self.className = 'class-list col-12';

        this.subClasses = document.createElement('div');
        //this.subClasses.className = '';

        this.titleBlock = document.createElement('div');
        this.titleBlock.className = 'title-block';

        this.titleName = document.createElement('div');
        this.titleName.style.flexGrow = 1;
        this.titleName.style.flexShrink = 1;
        this.titleName.innerText = this.name;

        this.titleNameInput = document.createElement('input');
        this.titleNameInput.className = 'title-name-input';
        this.titleNameInput.addEventListener('keyup', (ev) => {
            ev.preventDefault();
            if (ev.keyCode === 13) {
                const val = this.titleNameInput.value;
                if (val.trim() != '') {
                    //console.log(`${val} key enter`);
                    const bodyObj = {
                        id: this.dbId,
                        gameClass: val.trim()
                    };
                    this.titleName.innerHTML = '';
                    this.titleName.innerText = this.name;
                    const bodyJSON = JSON.stringify(bodyObj);
                    fetch('/gameClass', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': bodyJSON.length
                        },
                        body: bodyJSON
                    })
                        .then((res) => {
                            if (res.status == 201) {
                                this.name = bodyObj.gameClass;
                                this.titleName.innerHTML = '';
                                this.titleName.innerText = this.name;
                            } else {
                                console.log(`ERROR: res.status = ${res.status} | res = ${JSON.stringify(res)}`);
                            }
                        }, (err) => {
                            console.log(err);
                        })
                }
            }
        });

        this.titleButtonsArray = [];

        this.titleButtons = document.createElement('div');
        this.titleButtons.className = 'title-buttons';

        this.titleButtonAdd = document.createElement('button');
        this.titleButtonAdd.className = 'title-button-add';
        this.titleButtonAdd.onclick = () => {
            this.input.style.display = 'inline-block';
            this.buttonAddSubclass.style.display = 'inline-block';
            this.buttonCancelInput.style.display = 'inline-block';
        };

        this.titleButtonEdit = document.createElement('button');
        this.titleButtonEdit.className = 'title-button-edit';
        this.titleButtonEdit.onclick = this.titleEdit.bind(this);

        this.titleButtonDelete = document.createElement('button');
        this.titleButtonDelete.className = 'title-button-delete';
        this.titleButtonDelete.onclick = this.delete.bind(this);

        //this.titleButtons.appendChild(this.titleButtonAdd);
        //this.titleButtons.appendChild(this.titleButtonEdit);
        //this.titleButtons.appendChild(this.titleButtonDelete);

        this.titleButtons.style.display = 'none';

        this.titleBlock.appendChild(this.titleName);
        //this.titleBlock.appendChild(this.titleButtons);

        this.titleButtonsArray.push(this.titleButtonAdd);
        this.titleButtonsArray.push(this.titleButtonEdit);
        this.titleButtonsArray.push(this.titleButtonDelete);

        this.titleButtonsArray.forEach(it => {it.style.display = "none";});

        this.titleBlock.appendChild(this.titleButtonAdd);
        this.titleBlock.appendChild(this.titleButtonEdit);
        this.titleBlock.appendChild(this.titleButtonDelete);

        this.titleBlock.onmouseover = () => {
            //this.titleButtons.style.display = 'block';
            this.titleButtonsArray.forEach(it => {it.style.display = "block";});
        };

        this.titleBlock.onmouseleave = () => {
            this.titleButtonsArray.forEach(it => {it.style.display = "none";});
            //this.titleButtons.style.display = 'none';
        }

        this.input = document.createElement('input');
        this.input.className = 'col-5';
        this.input.style.display = 'none';

        this.buttonAddSubclass = document.createElement('button');
        this.buttonAddSubclass.className = 'add-element';
        this.buttonAddSubclass.onclick = () => { this.onClickAddSubclass({ sync: true }) };
        this.buttonAddSubclass.innerText = 'Add';
        this.buttonAddSubclass.style.display = 'none';

        this.buttonCancelInput = document.createElement('button');
        this.buttonCancelInput.className = 'cancel-input';
        this.buttonCancelInput.innerText = 'Cancel';
        this.buttonCancelInput.onclick = () => {
            this.buttonAddSubclass.style.display = 'none';
            this.buttonCancelInput.style.display = 'none';
            this.input.style.display = 'none';
            this.input.value = '';
        };
        this.buttonCancelInput.style.display = 'none';

        this.self.appendChild(this.titleBlock);
        this.self.appendChild(this.subClasses);
        this.self.appendChild(this.input);
        this.self.appendChild(this.buttonAddSubclass);
        this.self.appendChild(this.buttonCancelInput);
    }

    async render() {
        this.rootToAppend.appendChild(this.self);
        //console.log(`${this.name}: id = ${this.dbId}`);
    }

    async delete() {
        const bodyObj = {
            id: this.dbId,
            toDelete: true
        };
        const bodyJSON = JSON.stringify(bodyObj);
        fetch('/gameClass', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': bodyJSON.length
            },
            body: bodyJSON
        })
        .then((res) => {
            if (res.status == 200) {
                this.self.remove();
                this.panel.deleteClass(this);
            } else {
                console.log(`ERROR: res.status = ${res.status} | ${JSON.stringify(res)}`);
            }
        })
    }

    async titleEdit() {
        this.titleNameInput.value = this.name;
        this.titleName.innerHTML = '';
        this.titleName.appendChild(this.titleNameInput);
    }

    async onClickAddSubclass(obj) {
        console.log('onClickAddSubClass');
        const { sync, subClassName } = obj;
        if (sync) {
            const bodyObj = {
                id: this.dbId,
                addNewSubclass: this.input.value,
            };
            const bodyJSON = JSON.stringify(bodyObj);
            fetch('/gameClass', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': bodyJSON.length,
                },
                body: bodyJSON
            })
                .then(() => {
                    this.renderSubclass({ subClassName: bodyObj.addNewSubclass });
                    this.input.value = '';
                    this.input.style.display = 'none';
                    this.buttonAddSubclass.style.display = 'none';
                    this.buttonCancelInput.style.display = 'none';
                }, (err) => { console.log(JSON.stringify(err)) });
        } else {
            this.renderSubclass({ subClassName });
        }
    }

    renderSubclass(obj) {
        let value = obj.subClassName;
        let li = document.createElement('div'); //li
        li.className = 'el';
        li.innerText = value;
        this.subClasses.appendChild(li);
    }
}

class GameClassPanel {
    constructor(divName) {
        this.rootElement = document.getElementById(divName);
        this.gameClasses = [];
        this.gameClassDescs = undefined;
        this.addNewClassBlock = undefined;
        this.inputEl = undefined;
        this.buttonEl = undefined;
        this.prerender()
            .then(() => {
                this.render();
            });
    }

    async load() {
        const res = await fetch('gameClasses', {
            method: 'GET'
        });
        this.gameClassDescs = await res.json();
    }

    async prerender() {
        this.addIcon = document.createElement('img');
        this.addIcon.src = "/icons/add.svg";
        this.addIcon.style.display = 'block';
        this.addIcon.style.cursor = 'pointer';
        this.addIcon.onclick = () => {
            this.addIcon.style.display = 'none';
            this.addNewClassBlockHiddenBlock.style.display = 'block';
        }

        this.addNewClassBlock = document.createElement('div');
        this.addNewClassBlock.className = "col-12";

        this.addNewClassBlockHiddenBlock = document.createElement('div');
        this.addNewClassBlockHiddenBlock.innerHTML = `<span class="prompt">Add class:</span>`;

        this.inputEl = document.createElement('input');
        this.addNewClassBlockHiddenBlock.appendChild(this.inputEl);

        this.buttonAddEl = document.createElement('button');
        this.buttonAddEl.innerText = 'Add';
        this.buttonAddEl.onclick = () => {
            this.onClickAddNewClass();
            this.addIcon.style.display = 'block';
            this.addNewClassBlockHiddenBlock.style.display = 'none';
        };
        this.addNewClassBlockHiddenBlock.appendChild(this.buttonAddEl);

        this.buttonCancelEl = document.createElement('button');
        this.buttonCancelEl.innerText = 'Cancel';
        this.buttonCancelEl.onclick = () => {
            this.inputEl.value = '';
            this.addIcon.style.display = 'block';
            this.addNewClassBlockHiddenBlock.style.display = 'none';
        }
        this.addNewClassBlockHiddenBlock.appendChild(this.buttonCancelEl);

        this.addNewClassBlockHiddenBlock.style.display = 'none';

        this.addNewClassBlock.appendChild(this.addIcon);
        this.addNewClassBlock.appendChild(this.addNewClassBlockHiddenBlock);
    }

    async render() {
        this.rootElement.innerHTML = '';
        this.rootElement.appendChild(this.addNewClassBlock);
        await this.load();
        //console.log(JSON.stringify(this.gameClassDescs));
        this.gameClasses = [];
        this.gameClassDescs.forEach((classDesc) => {
            this.gameClasses.push(new GameClass({
                panel: this,
                name: classDesc.gameClass,
                subClasses: classDesc.subClasses,
                dbId: classDesc._id,
                rootToAppend: this.rootElement,
                sync: false
            }))
        });
    }

    async onClickAddNewClass() {
        const newClassName = this.inputEl.value;
        this.inputEl.value = '';
        this.gameClasses.push(new GameClass({ panel: this, name: newClassName, rootToAppend: this.rootElement, sync: true }));
        console.log(`onClickAddNewClass: ${this.gameClasses.length}`);
    }

    async deleteClass(obj) {
        const ind = this.gameClasses.indexOf(obj);
        //console.log(`deleteClass: ${ind} / ${this.gameClasses.length}`)
        if (ind == -1) {
            console.log(`ERROR: deleteClass: ind == -1 | obj = ${JSON.stringify(obj)}`);
        } else {
            this.gameClasses.splice(ind,1);
        }
        //console.log(`deleteClass: ${this.gameClasses.length}`);
    }
}

const gameClassPanel = new GameClassPanel('classMenu');

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
    saveFieldSettings,
    getFieldSettings,
    savePanelSettings,
    getPanelSettings,
    saveLinesSettings,
    getLinesSettings,
};
