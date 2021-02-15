/* Фрагмент 1

    elmnt.innerHTML = "<h4 class='headerText'>" + headStr + "" +
        "<button onclick='openTurnModal()'>edit</button></h4><hr><p class='paragraphText'>" + parStr + "</p>";

    // *************************************************************************************

    //  elmnt.addEventListener('mousemove', (e) => {...});    - window.event is deprecated
     elmnt.onmousedown = dragMouseDown;

     function dragMouseDown(e) {
       e = e || window.event;
       e.preventDefault();
       // get the mouse cursor position at startup:
       pos3 = e.clientX;
       pos4 = e.clientY;
       document.onmouseup = closeDragElement;
       // call a function whenever the cursor moves:
       document.onmousemove = elementDrag;
     }

     function elementDrag(e) {
       e = e || window.event;
       e.preventDefault();
       // calculate the new cursor position:
       pos1 = pos3 - e.clientX;
       pos2 = pos4 - e.clientY;
       pos3 = e.clientX;
       pos4 = e.clientY;
       // set the element's new position:
       elmnt.style.top = pos4 - 100 + "px";
       elmnt.style.left = pos3 - 500 + "px";
       // elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
       // elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
     }

     function closeDragElement() {
       // stop moving when mouse button is released:
       document.onmouseup = null;
       document.onmousemove = null;
     }



// Фрагмент 2

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


// Фрагмент 3

        // if (
        //     $("#gameBox").width() < sourceCoords.left &&
        //     $("#gameBox").width() < targetCoords.left
        // ) {
        //     continue;
        // }
        // if (sourceCoords.left < 0 && targetCoords.left < 0) {
        //     continue;
        // }
        // if (
        //     $("#gameBox").height() < sourceCoords.top &&
        //     $("#gameBox").height() < targetCoords.top
        // ) {
        //     continue;
        // }
        // if (sourceCoords.top < 0 && targetCoords.left < top) {
        //     continue;
        // }





Фрагмент 4

<div id="modalBackground">
</div>
        <div id="modal" class="container">
            <div class="row my-4">
                <div class="col-4">
                    <div class="my-4">
                        <input type="text" class="form-control" id="headerInput" />
                    </div>
                    <div class="my-4">
                        <input type="date" class="form-control" id="dateInput" />
                    </div>
                    <div class="my-4">
                        <input type="text" class="form-control" id="sourceUrlInput" />
                    </div>
                </div>
                <div class="col-4">
                    <div class="my-4">
                        <input type="text" class="form-control" id="imageUrlInput" style="display:none;" />
                    </div>
                    <div class="my-4">
                        <input type="text" class="form-control" id="videoUrlInput" style="display:none;" />
                    </div>
                </div>
            </div>
            <div class="row my-4">
                <div class="col">
                    <div id="toolbar-container">
                        <span class="ql-formats">
                            <select class="ql-background">
                                <option selected></option>
                                <option value="yellow"></option>
                            </select>
                        </span>
                    </div>
                    <div id="editor-container"></div>
                    <!-- class="h-85"> -->
                </div>
            </div>
            <div class="row mb-4">
                <div class="col">
                    <button id="modalSaveButton">Save</button>
                    <button id="cancel-turn-modal">Close</button>
                </div>
            </div>
        </div>



Фрагмент 5

                <select id="turn-type">
                        <option value="article">Text</option>
                    <option value="picture">Text with picture</option>
                        <!-- <option value="book">Book</option>
                        <option value="lyrics">Poetry</option>
                        <option value="pdf">PDF Document</option> -->
                    <option value="video">Text with video</option>
                        <!-- <option value="audio">Audio</option> -->
                    <option value="comment">Comment</option>
                </select>
                <br>
                Header: <input id="headerText" />
                <br>
                Text: <textarea id="paragraphText"></textarea>
                <br>

Фрагмент 6
                <div id="params-wrapper">
                </div>
                <!--                    
                <div id="image-params-wrapper">Image URL: <input id="image-url" type="text" /></div>
                -->


                
// Фрагмент 7

  
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



