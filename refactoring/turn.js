import { dateFormatter } from './formatters/dateFormatter'
import { youtubeFormatter } from './formatters/youtubeFormatter'

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
            start: (event, ui) => triggers.dispatch('MAKE_FIELD_TRANSLUCENT', true),
            stop: (event, ui) => {
                triggers.dispatch('DRAW_LINES');
                triggers.dispatch('MAKE_FIELD_TRANSLUCENT', false);
            },
            drag: (event, ui) => triggers.dispatch('DRAW_LINES')
        });
        this.handleResize();
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

    getPositionInfo() {
        return {
            x: parseInt(this.el.style.left) || 0,
            y: parseInt(this.el.style.top) || 0,
            height: parseInt(this.el.style.height),
            width: parseInt(this.el.style.width),
            id: this.el.dataset.id,
            contentType: this.el.dataset.contentType,
            scrollPosition: this.paragraphEl ? this.paragraphEl.scrollTop : null,
        }
    }
    moveEl(dLeft, dTop) {
        // debugger;
        this.el.style.left = `${parseInt(this.el.style.left) + dLeft}px`
        this.el.style.top = `${parseInt(this.el.style.top) + dTop}px`
    }
    handleResize() {
        let minMediaHeight = 120; // @todo 
        let maxMediaHeight = this.paragraphEl.scrollHeight + 20;
        // console.log($(this.paragraphEl).innerHeight());

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

    getTopHeight() {
        const headerHeight = $(this.headerEl).height() || 0;
        const pictureHeight = $(this.imgEl).height() || 0;
        const iFrameHeight = $(this.videoEl).height() || 0;
        return headerHeight + pictureHeight + iFrameHeight;
    }

    getBottomHeight() {
        const paragraphHeight = $(this.paragraphEl).height();
        const headerHeight = $(this.headerEl).height() || 0;
        const pictureHeight = $(this.imgEl).height() || 0;
        const iFrameHeight = $(this.videoEl).height() || 0;
        return headerHeight + paragraphHeight + pictureHeight + iFrameHeight
    }

    update() {
        this.needToRender = true;
        this.render();
    }

    getQuoteElements() {
        return $(this.paragraphEl)
            .find('span')
            .toArray()
            .filter((spanEl) => {
                return $(spanEl).css('background-color') === 'rgb(255, 255, 0)';
            });
    }

    render() {
        if (!this.needToRender) {                      // для оптимизации рендера
            return false;
        }
        this.needToRender = false;
        this.removeEventHandlers();
        const {
            header,
            paragraph,
            imageUrl,
            sourceUrl,
        } = this.data;
        let { date, videoUrl } = this.data;
        if (date) { date = dateFormatter(date) };               // лежит в папке "refactoring/formatters"
        if (videoUrl) { videoUrl = youtubeFormatter(videoUrl); };    // лежит там же

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
                src="https://www.youtube.com/embed/${videoUrl}"
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
    scrollParagrahpHandler() {
        this.data.scrollPosition = this.paragraphEl.scrollTop;
        if(this.triggers.dispatch) {
            this.triggers.dispatch('DRAW_LINES')
        }
    }
    // inner handlers
    removeEventHandlers() {
        this.deleteBtn && this.deleteBtn.removeEventListener('click', this.deleteButtonHandler.bind(this));
        this.editBtn && this.editBtn.removeEventListener('click', this.editButtonHandler.bind(this));
    }
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

        $(this.paragraphEl).ready(() => {
            this.paragraphEl.scrollTop = this.data.scrollPosition
        })

        this.deleteBtn.addEventListener('click', this.deleteButtonHandler.bind(this));
        this.editBtn.addEventListener('click', this.editButtonHandler.bind(this));
        this.paragraphEl.addEventListener('scroll', this.scrollParagrahpHandler.bind(this))
    }
    destroy() {
        // @todo: remove common handlers
        // @todo: remove inner handlers
        // remove DOM element
        this.el.remove();
    }
}

export default Turn;