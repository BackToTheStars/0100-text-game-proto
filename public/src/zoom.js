
let zoom = 1;

function zoomInOut(num) {
    zoom = (Math.round((zoom + 0.1 * num) * 100)) / 100;

    if (zoom < 0) {
        zoom = 0;
    }
    if (zoom > 1.75) {
        zoom = 1.75;
    }

    console.log(zoom);
    console.log(gameTurns);

    let boxes = gameBox.getElementsByClassName("textBox");
    for (let i = 0; i < boxes.length; i++) {
        boxes[i].style.transform = "scale(" + zoom + ")";
        boxes[i].style.left = (gameTurns[i].x * zoom) + "px";
        boxes[i].style.top = (gameTurns[i].y * zoom) + "px";
    }
}






