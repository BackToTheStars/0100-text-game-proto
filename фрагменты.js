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