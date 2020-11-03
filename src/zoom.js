let zoom = 1;

const zoomInOut = (num) => {
    zoom = Math.round((zoom + 0.1 * num) * 100) / 100;

    if (zoom < 0) {
        zoom = 0;
    }
    if (zoom > 1.75) {
        zoom = 1.75;
    }

    let boxes = gameBox.getElementsByClassName('textBox');

    for (let i = 0; i < boxes.length; i++) {
        boxes[i].style.transform = `scale(${zoom}) translate(${zoom * 100}%, ${
            zoom * 100
        }%)`;
    }
};

export { zoomInOut };
