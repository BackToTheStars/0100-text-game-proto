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