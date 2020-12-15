import { dateFormatter } from './formatters/dateFormatter'
import { youtubeFormatter } from './formatters/youtubeFormatter'
import { getShortLink } from './formatters/urlFormatter'

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
            x: parseInt($(this.el).css('left')) || 0,
            y: parseInt($(this.el).css('top')) || 0,
            height: parseInt($(this.el).height()),
            width: parseInt($(this.el).width()),
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
        let minMediaHeight = 15; // @todo

        let maxMediaHeight = this.paragraphEl.scrollHeight + 15; // 15 это снизу появляется нестыковка
        // console.log($(this.paragraphEl).innerHeight());

        if (this.imgEl) {
            const newImgHeight = Math.floor(
                (this.imgEl.naturalHeight * $(this.el).width()) /
                this.imgEl.naturalWidth
            );
            $(this.imgWrapperEl).width($(this.el).width());
            $(this.imgWrapperEl).height(newImgHeight);
            minMediaHeight += newImgHeight;
            maxMediaHeight += newImgHeight;
            $(this.mediaWrapperEl).css('min-height', `${minMediaHeight}px`);
        } else if (this.videoEl) {
            $(this.videoEl).width($(this.el).width()-3);   // можно использовать в дизайне 
            $(this.videoEl).height(Math.floor((9 * $(this.el).width()) / 16));
            minMediaHeight += $(this.videoEl).height();
            maxMediaHeight += $(this.videoEl).height();
            $(this.mediaWrapperEl).css('min-height', `${minMediaHeight}px`);
        }
        // получить высоту el, вычесть высоту header, сохранить в media wrapper
        $(this.mediaWrapperEl).height(
            // @fixme: 1px
            $(this.el).height() + 1 - $(this.headerEl).height()
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
        const pictureHeight = $(this.imgWrapperEl).height() || 0;
        const iFrameHeight = $(this.videoEl).height() || 0;
        return headerHeight + pictureHeight + iFrameHeight;
    }

    getBottomHeight() {
        const paragraphHeight = $(this.paragraphEl).height();
        const headerHeight = $(this.headerEl).height() || 0;
        const pictureHeight = $(this.imgWrapperEl).height() || 0;
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
            <div class="headerTextTitle">${header}</div>
            <div class="headerTextActions">
                <a class="edit-btn"><i class="fas fa-pen-square"></i></a>
                <a class="delete-btn"><i class="fas fa-trash-alt"></i></a>
            </div>
        </h5>
        ${sourceUrl ? `<div class="left-bottom-label">
            <a href="${sourceUrl}">
                ${getShortLink(sourceUrl)}
            </a>
        </div>` : ''}
        ${date ? `<div class="right-bottom-label">${date}</div>` : ''}
        <div
            class="media-wrapper"
            style="display: flex; flex-direction: column; align-items: center;">
            ${videoUrl && videoUrl.trim()
                ? `<div class="video">
                <div class="iframe-overlay"></div>
                <iframe
                    src="https://www.youtube.com/embed/${videoUrl}"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    style="width: 100%; height: 100%;">
                </iframe>
                </div>`
                : ''
            }
            ${imageUrl && imageUrl.trim()
                ? `<div class="picture-content">
                    <img src="${imageUrl}"
                        style="background: rgb(0, 0, 0); width: 100%; height: 100%;">
                </div>`
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
        this.imgWrapperEl = this.el.querySelector('.picture-content');
        this.imgEl = this.imgWrapperEl ? this.imgWrapperEl.querySelector('img') : null;
        this.paragraphEl = this.el.querySelector('.paragraphText');

        // @todo: remove after quill fix
        if(!$(this.paragraphEl).text().trim()) {
            $(this.paragraphEl).css('display','none');
        }

        $(this.paragraphEl).ready(() => {
            this.paragraphEl.scrollTop = this.data.scrollPosition
        })

        this.deleteBtn.addEventListener('click', this.deleteButtonHandler.bind(this));
        this.editBtn.addEventListener('click', this.editButtonHandler.bind(this));
        this.paragraphEl.addEventListener('scroll', this.scrollParagrahpHandler.bind(this))
        this.el.addEventListener('dblclick', () => this.triggers.dispatch('TOGGLE_LINES_FRONT_BACK'));
    }
    destroy() {
        // @todo: remove common handlers
        // @todo: remove inner handlers
        // remove DOM element
        this.el.remove();
    }
}

export default Turn;