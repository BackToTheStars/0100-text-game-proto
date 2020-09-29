function toggleLinesVisibility() {
    // document.querySelector("#lines").style.display = "none";
    // document.querySelector("#lines").classList.toggle();
    // $("#lines").css('display', 'none'); // Jquery  
    // $("#lines").hide();
    $("#lines").toggle();    // Jquery
}

function toggleLinesZIndex() {
    frontLinesFlag = !frontLinesFlag;
    $("#lines").toggleClass("front-elements");
}