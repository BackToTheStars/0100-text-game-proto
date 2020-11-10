/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is not neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./refactoring/collections.js":
/*!************************************!*\
  !*** ./refactoring/collections.js ***!
  \************************************/
/*! namespace exports */
/*! export TurnCollection [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"TurnCollection\": () => /* binding */ TurnCollection\n/* harmony export */ });\n/* harmony import */ var _turn__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./turn */ \"./refactoring/turn.js\");\n\r\n\r\n// предназначен для предоставления доступа к шагам,\r\n// но знает минимум об их реализации\r\nclass TurnCollection {\r\n    constructor({ turnsData, stageEl }, triggers) {\r\n        this.stageEl = stageEl;\r\n        this.triggers = triggers;\r\n        this.turnObjects = turnsData.map((data) => new _turn__WEBPACK_IMPORTED_MODULE_0__.default({ data, stageEl }, triggers));\r\n    }\r\n    getTurns() {\r\n        return this.turnObjects;\r\n    }\r\n    getTurn({ _id }) {\r\n        return this.turnObjects.find((turnObject) => turnObject._id === _id);\r\n    }\r\n    addTurn(data) {\r\n        this.turnObjects.push(new _turn__WEBPACK_IMPORTED_MODULE_0__.default({ data, stageEl: this.stageEl }, this.triggers));\r\n    }\r\n    updateTurn(data) {\r\n        const turnObject = this.getTurn({ _id: data._id });\r\n        turnObject.setData(data);\r\n    }\r\n    removeTurn({ _id }) {\r\n        const index = this.turnObjects.findIndex(\r\n            (turnObject) => turnObject._id === _id\r\n        );\r\n        this.turnObjects.slice(index, 1);\r\n    }\r\n}\r\n\r\n\n\n//# sourceURL=webpack://0100-text-game-proto/./refactoring/collections.js?");

/***/ }),

/***/ "./refactoring/formatters/dateFormatter.js":
/*!*************************************************!*\
  !*** ./refactoring/formatters/dateFormatter.js ***!
  \*************************************************/
/*! namespace exports */
/*! export dateFormatter [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"dateFormatter\": () => /* binding */ dateFormatter\n/* harmony export */ });\n/*\r\n\r\nИдея в том, чтобы все преобразователи, типа дат, убрать из основного кода в папку \"formatters\",\r\nи если профессор из Ирана играет с профессором из Китая, то у одного дата будет в формате \"۱۳۹۹/۸/۵\", \r\nа у другого - \"2020年10月17日\"\r\n\r\nhttps://medium.com/swlh/use-tolocaledatestring-to-format-javascript-dates-2959108ea020\r\n\r\nОпции:\r\n'en-GB' - Россия, Англия\r\n'zh-CN' - Китайский\r\n'de-DE' - Германия\r\n'fa-IR' - Фарси, Иран\r\n'ar-EG' - Арабский\r\n'en-US' - США\r\n'ko-KR' - Корея\r\n\r\n*/\r\n\r\nfunction dateFormatter(dateString) {\r\n\r\n    const options = {\r\n        // weekday: 'long',\r\n        year: 'numeric',         // '2-digit'\r\n        month: 'long',           // 'short'\r\n        day: 'numeric',\r\n        // timeZoneName: 'short'\r\n    };\r\n\r\n    const date = new Date(dateString).toLocaleDateString('en-GB', options);\r\n\r\n    return date;\r\n}\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\n\n//# sourceURL=webpack://0100-text-game-proto/./refactoring/formatters/dateFormatter.js?");

/***/ }),

/***/ "./refactoring/game.js":
/*!*****************************!*\
  !*** ./refactoring/game.js ***!
  \*****************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./service */ \"./refactoring/service.js\");\n/* harmony import */ var _collections__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./collections */ \"./refactoring/collections.js\");\n\r\n\r\n\r\n\r\n// настраивает компоненты игры,\r\n// обеспечивает передачу данных между компонентами\r\nclass Game {\r\n    constructor({ stageEl }) {\r\n        this.stageEl = stageEl;\r\n        this.triggers = {}\r\n    }\r\n    async init() {\r\n        this.turnCollection = new _collections__WEBPACK_IMPORTED_MODULE_0__.TurnCollection({\r\n            turnsData: await (0,_service__WEBPACK_IMPORTED_MODULE_1__.getTurns)(),\r\n            stageEl: this.stageEl,\r\n        }, this.triggers);\r\n        this.triggers.dispatch = (type, data) => {\r\n            switch (type) {                               \r\n                case 'DRAW_LINES': {\r\n                    console.log('DRAW_LINES')\r\n                    break;\r\n                }\r\n                case 'REMOVE_TURN': {\r\n                    this.turnCollection.getTurn(data).destroy();\r\n                    // @todo: backend request\r\n                    this.turnCollection.removeTurn(data);\r\n                    break;\r\n                }\r\n                case 'OPEN_POPUP': {\r\n                    alert(\"OPEN_POPUP\")\r\n                    console.log(data);\r\n                    break;\r\n                }\r\n                case 'ZOOM'                : { break; }        // д.з. какие здесь ещё понадобятся функции?\r\n                case 'MANAGE_CLASS'        : { break; }\r\n                case 'MANAGE_SUBCLASS'     : { break; }\r\n                case 'FLY_TO_MINIMAP'      : { break; }\r\n            }\r\n        }\r\n    }\r\n}\r\n\r\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Game);\r\n\n\n//# sourceURL=webpack://0100-text-game-proto/./refactoring/game.js?");

/***/ }),

/***/ "./refactoring/index.js":
/*!******************************!*\
  !*** ./refactoring/index.js ***!
  \******************************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _game__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./game */ \"./refactoring/game.js\");\n\r\n\r\n(async () => {\r\n    const game = new _game__WEBPACK_IMPORTED_MODULE_0__.default({\r\n        stageEl: $('#gameBox'),\r\n    });\r\n    await game.init();\r\n})();\r\n\n\n//# sourceURL=webpack://0100-text-game-proto/./refactoring/index.js?");

/***/ }),

/***/ "./refactoring/service.js":
/*!********************************!*\
  !*** ./refactoring/service.js ***!
  \********************************/
/*! namespace exports */
/*! export getTurns [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"getTurns\": () => /* binding */ getTurns\n/* harmony export */ });\nconst getTurns = async () =>\r\n    new Promise((resolve, reject) => {\r\n        $.ajax({\r\n            type: 'GET',\r\n            url: '/getTurns',\r\n            success: resolve,\r\n            error: reject,\r\n        });\r\n    });\r\n\r\n\n\n//# sourceURL=webpack://0100-text-game-proto/./refactoring/service.js?");

/***/ }),

/***/ "./refactoring/turn.js":
/*!*****************************!*\
  !*** ./refactoring/turn.js ***!
  \*****************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => __WEBPACK_DEFAULT_EXPORT__\n/* harmony export */ });\n/* harmony import */ var _formatters_dateFormatter__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./formatters/dateFormatter */ \"./refactoring/formatters/dateFormatter.js\");\n\r\n\r\n\r\nconst getYoutubeId = (address) => {\r\n    return address.slice(address.lastIndexOf('?v=') + 3);\r\n};\r\nconst getParagraphText = (arrText) => {\r\n    // @todo: remove\r\n    const el = document.createElement('p');\r\n    for (let textItem of arrText) {\r\n        const spanEl = document.createElement('span');\r\n        if (textItem.attributes) {\r\n            for (let property of Object.keys(textItem.attributes)) {\r\n                spanEl.style[property] = textItem.attributes[property];\r\n            }\r\n        }\r\n        spanEl.innerText = textItem.insert;\r\n        el.appendChild(spanEl);\r\n    }\r\n    return el.innerHTML;\r\n};\r\n\r\n\r\n// размещает элемент игры на поле на основе полученных настроек\r\n// реагирует на события в DOM и меняет свои настройки\r\n// предоставляет свои настройки другим компонентам \r\nclass Turn {\r\n    constructor({ data, stageEl }, triggers) {\r\n        this._id = data._id;\r\n        this.data = data;\r\n        this.triggers = triggers;\r\n\r\n        this.needToRender = true;\r\n        this.el = this.createDomEl();\r\n        stageEl.append(this.el);\r\n        this.updateSizes(this.data);\r\n        this.render();\r\n\r\n        // common handlers\r\n        this.el.onresize = this.handleResize.bind(this);          // биндит контекст к другой функции\r\n        $(this.el).resizable({\r\n            stop: (event, ui) => triggers.dispatch('DRAW_LINES')\r\n        });\r\n        $(this.el).draggable({\r\n            // drawLinesByEls(lineInfoEls, true); // @todo check frontLinesFlag);\r\n            stop: (event, ui) => triggers.dispatch('DRAW_LINES')\r\n        });\r\n    }\r\n    createDomEl() {\r\n        const { _id, contentType } = this.data;\r\n        const el = document.createElement('div');\r\n        el.dataset.id = _id; // data attribute для div-a\r\n        el.className = `textBox ui-widget-content ${contentType}-type`;\r\n        el.dataset.contentType = contentType;\r\n        return el;\r\n    }\r\n    setData(data) {\r\n        this.data = data;\r\n        this.needToRender = true;\r\n    }\r\n    updateSizes({ x, y, height, width }) {\r\n        this.el.style.left = `${x}px`;\r\n        this.el.style.top = `${y}px`;\r\n        this.el.style.height = `${height}px`;\r\n        this.el.style.width = `${width}px`;\r\n    }\r\n    handleResize() {\r\n        let minMediaHeight = 120;\r\n        let maxMediaHeight = this.paragraphEl.scrollHeight + 20;\r\n        // console.log($(this.paragraphEl).innerHeight());\r\n\r\n        if (this.imgEl) {\r\n            $(this.imgEl).width($(this.el).width());\r\n            $(this.imgEl).height(\r\n                Math.floor(\r\n                    (this.imgEl.naturalHeight * $(this.el).width()) /\r\n                    this.imgEl.naturalWidth\r\n                )\r\n            );\r\n            minMediaHeight += $(this.imgEl).height();\r\n            maxMediaHeight += $(this.imgEl).height();\r\n            $(this.mediaWrapperEl).css('min-height', `${minMediaHeight}px`);\r\n        } else if (this.videoEl) {\r\n            $(this.videoEl).width($(this.el).width() - 4);\r\n            $(this.videoEl).height(Math.floor((9 * $(this.el).width()) / 16));\r\n            minMediaHeight += $(this.videoEl).height();\r\n            maxMediaHeight += $(this.videoEl).height();\r\n            $(this.mediaWrapperEl).css('min-height', `${minMediaHeight}px`);\r\n        }\r\n        // получить высоту el, вычесть высоту header, сохранить в media wrapper\r\n        $(this.mediaWrapperEl).height(\r\n            $(this.el).height() - $(this.headerEl).height()\r\n        );\r\n        $(this.el).css(\r\n            'min-height',\r\n            `${minMediaHeight + $(this.headerEl).height()}px`\r\n        );\r\n        $(this.el).css(\r\n            'max-height',\r\n            `${maxMediaHeight + $(this.headerEl).height()}px`\r\n        );\r\n    }\r\n    render() {\r\n        if (!this.needToRender) {                    // для оптимизации рендера\r\n            return false;\r\n        }\r\n        this.needToRender = false;\r\n        this.removeEventHandlers();\r\n        const {\r\n            header,\r\n            paragraph,\r\n            imageUrl,\r\n            videoUrl,\r\n            sourceUrl,\r\n        } = this.data;\r\n        let { date } = this.data;\r\n\r\n        if (date) { date = (0,_formatters_dateFormatter__WEBPACK_IMPORTED_MODULE_0__.dateFormatter)(date) };\r\n\r\n        this.el.innerHTML = `<h5 class=\"headerText\">\r\n            ${header}\r\n            <button class=\"edit-btn\">Edit</button>\r\n            <button class=\"delete-btn\">Delete</button>\r\n        </h5>\r\n        ${sourceUrl ? `<div class=\"left-bottom-label\">${sourceUrl}</div>` : ''}\r\n        ${date ? `<div class=\"right-bottom-label\">${date}</div>` : ''}\r\n        <div\r\n            class=\"media-wrapper\"\r\n            style=\"display: flex; flex-direction: column; align-items: center;\">\r\n            ${videoUrl && videoUrl.trim()\r\n                ? `<iframe\r\n                class=\"video\"\r\n                src=\"https://www.youtube.com/embed/${getYoutubeId(videoUrl)}\"\r\n                allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture\"\r\n                style=\"width: 100%; height: 90%; top: 0px; left: 0px;\">\r\n            </iframe>`\r\n                : ''\r\n            }\r\n            ${imageUrl && imageUrl.trim()\r\n                ? `<img class=\"picture-content\" src=\"${imageUrl}\"\r\n                style=\"background: rgb(0, 0, 0); width: 100%;\">`\r\n                : ''\r\n            }\r\n            <p class=\"paragraphText\">\r\n                ${getParagraphText(paragraph || [])}\r\n            </p>\r\n        </div>`;\r\n        this.addEventHandlers();\r\n    }\r\n    deleteButtonHandler() {\r\n        console.log(this.triggers)\r\n        if (confirm('Точно удалить?')) {\r\n            this.triggers.dispatch('REMOVE_TURN', this.data)\r\n            // @todo: удалить привязки и линии связи\r\n            // deleteTurn(obj);\r\n        }\r\n    };\r\n    editButtonHandler() {\r\n        this.triggers.dispatch('OPEN_POPUP', this.data)\r\n        // game.popup.openModal();\r\n        // game.popup.setTurn(turnModel);\r\n    };\r\n    // inner handlers\r\n    removeEventHandlers() { }\r\n    addEventHandlers() {\r\n        this.editBtn = this.el.querySelector('.edit-btn');\r\n        this.deleteBtn = this.el.querySelector('.delete-btn');\r\n        // media-wrapper\r\n        this.mediaWrapperEl = this.el.querySelector('.media-wrapper');\r\n        // headerText\r\n        this.headerEl = this.el.querySelector('.headerText');\r\n        this.videoEl = this.el.querySelector('.video');\r\n        this.imgEl = this.el.querySelector('.picture-content');\r\n        this.paragraphEl = this.el.querySelector('.paragraphText');\r\n        this.handleResize();\r\n\r\n        this.deleteBtn.addEventListener('click', this.deleteButtonHandler.bind(this));\r\n        this.editBtn.addEventListener('click', this.editButtonHandler.bind(this));\r\n    }\r\n    destroy() {\r\n        // @todo: remove common handlers\r\n        // @todo: remove inner handlers\r\n        // remove DOM element\r\n        this.el.remove();\r\n    }\r\n}\r\n\r\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Turn);\n\n//# sourceURL=webpack://0100-text-game-proto/./refactoring/turn.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	__webpack_require__("./refactoring/index.js");
/******/ 	// This entry module used 'exports' so it can't be inlined
/******/ })()
;