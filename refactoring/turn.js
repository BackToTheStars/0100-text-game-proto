
const getYoutubeId = (address) => {
    return address.slice(address.lastIndexOf('?v=') + 3);
};
const getParagraphText = (arrText) => {
    // @todo: remove
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
};


// размещает элемент игры на поле на основе полученных настроек
// реагирует на события в DOM и меняет свои настройки
// предоставляет свои настройки другим компонентам 
class Turn {
    constructor({ data, stageEl }, triggers) {
        this._id = data._id;
        this.data = data;
        this.triggers = triggers;

        this.needToRender = true;
        this.el = this.createDomEl();
        stageEl.append(this.el);
        this.updateSizes(this.data);
        this.render();

        // common handlers
        this.el.onresize = this.handleResize.bind(this);          // биндит контекст к другой функции
        $(this.el).resizable({
            stop: (event, ui) => triggers.dispatch('DRAW_LINES')
        });
        $(this.el).draggable({
            // drawLinesByEls(lineInfoEls, true); // @todo check frontLinesFlag);
            stop: (event, ui) => triggers.dispatch('DRAW_LINES')
        });
    }
    createDomEl() {
        const { _id, contentType } = this.data;
        const el = document.createElement('div');
        el.dataset.id = _id; // data attribute для div-a
        el.className = `textBox ui-widget-content ${contentType}-type`;
        el.dataset.contentType = contentType;
        return el;
    }
    setData(data) {
        this.data = data;
        this.needToRender = true;
    }
    updateSizes({ x, y, height, width }) {
        this.el.style.left = `${x}px`;
        this.el.style.top = `${y}px`;
        this.el.style.height = `${height}px`;
        this.el.style.width = `${width}px`;
    }
    handleResize() {
        let minMediaHeight = 120;
        let maxMediaHeight = this.paragraphEl.scrollHeight + 20;
        console.log($(this.paragraphEl).innerHeight());

        if (this.imgEl) {
            $(this.imgEl).width($(this.el).width());
            $(this.imgEl).height(
                Math.floor(
                    (this.imgEl.naturalHeight * $(this.el).width()) /
                    this.imgEl.naturalWidth
                )
            );
            minMediaHeight += $(this.imgEl).height();
            maxMediaHeight += $(this.imgEl).height();
            $(this.mediaWrapperEl).css('min-height', `${minMediaHeight}px`);
        } else if (this.videoEl) {
            $(this.videoEl).width($(this.el).width() - 4);
            $(this.videoEl).height(Math.floor((9 * $(this.el).width()) / 16));
            minMediaHeight += $(this.videoEl).height();
            maxMediaHeight += $(this.videoEl).height();
            $(this.mediaWrapperEl).css('min-height', `${minMediaHeight}px`);
        }
        // получить высоту el, вычесть высоту header, сохранить в media wrapper
        $(this.mediaWrapperEl).height(
            $(this.el).height() - $(this.headerEl).height()
        );
        $(this.el).css(
            'min-height',
            `${minMediaHeight + $(this.headerEl).height()}px`
        );
        $(this.el).css(
            'max-height',
            `${maxMediaHeight + $(this.headerEl).height()}px`
        );
    }
    render() {
        if (!this.needToRender) {                    // для оптимизации рендера
            return false;
        }
        this.needToRender = false;
        this.removeEventHandlers();
        const {
            header,
            paragraph,
            imageUrl,
            videoUrl,
            sourceUrl,
            date,
        } = this.data;

        this.el.innerHTML = `<h5 class="headerText">
            ${header}
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
        </h5>
        ${sourceUrl ? `<div class="left-bottom-label">${sourceUrl}</div>` : ''}
        ${date ? `<div class="right-bottom-label">${date}</div>` : ''}
        <div
            class="media-wrapper"
            style="display: flex; flex-direction: column; align-items: center;">
            ${videoUrl && videoUrl.trim()
                ? `<iframe
                class="video"
                src="https://www.youtube.com/embed/${getYoutubeId(videoUrl)}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                style="width: 100%; height: 90%; top: 0px; left: 0px;">
            </iframe>`
                : ''
            }
            ${imageUrl && imageUrl.trim()
                ? `<img class="picture-content" src="${imageUrl}"
                style="background: rgb(0, 0, 0); width: 100%;">`
                : ''
            }
            <p class="paragraphText">
                ${getParagraphText(paragraph || [])}
            </p>
        </div>`;
        this.addEventHandlers();
    }
    deleteButtonHandler() {
        console.log(this.triggers)
        if (confirm('Точно удалить?')) {
            this.triggers.dispatch('REMOVE_TURN', this.data)
            // @todo: удалить привязки и линии связи
            // deleteTurn(obj);
        }
    };
    editButtonHandler() {
        this.triggers.dispatch('OPEN_POPUP', this.data)
        // game.popup.openModal();
        // game.popup.setTurn(turnModel);
    };
    // inner handlers
    removeEventHandlers() { }
    addEventHandlers() {
        this.editBtn = this.el.querySelector('.edit-btn');
        this.deleteBtn = this.el.querySelector('.delete-btn');
        // media-wrapper
        this.mediaWrapperEl = this.el.querySelector('.media-wrapper');
        // headerText
        this.headerEl = this.el.querySelector('.headerText');
        this.videoEl = this.el.querySelector('.video');
        this.imgEl = this.el.querySelector('.picture-content');
        this.paragraphEl = this.el.querySelector('.paragraphText');
        this.handleResize();

        this.deleteBtn.addEventListener('click', this.deleteButtonHandler.bind(this));
        this.editBtn.addEventListener('click', this.editButtonHandler.bind(this));
    }
    destroy() {
        // @todo: remove common handlers
        // @todo: remove inner handlers
        // remove DOM element
        this.el.remove();
    }
}

export default Turn;