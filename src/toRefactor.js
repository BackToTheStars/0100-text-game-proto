function toggleLinesVisibility() {
    // document.querySelector("#lines").style.display = "none";
    // document.querySelector("#lines").classList.toggle();
    // $("#lines").css('display', 'none'); // Jquery  
    // $("#lines").hide();
    $("#lines").toggle();    // Jquery
}

const toggleLinesZIndex = (callback) => {
    callback();
    $("#lines").toggleClass("front-elements");
}

function toggleLeftClassPanel() {
    $("#classMenu").toggleClass("hidden");
    classesPanelSettings.visible = !classesPanelSettings.visible;
    savePanelSettings(classesPanelSettings);
    drawLinesByEls(lineInfoEls, frontLinesFlag);
}

export {
    toggleLinesZIndex
}