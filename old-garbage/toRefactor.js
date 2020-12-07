const toggleLinesVisibility = () => {
    // document.querySelector("#lines").style.display = "none";
    // document.querySelector("#lines").classList.toggle();
    // $("#lines").css('display', 'none'); // Jquery
    // $("#lines").hide();
    $('#lines').toggle(); // Jquery
};

const toggleLinesZIndex = (callback) => {
    callback();
    $('#lines').toggleClass('front-elements');
};

const toggleLeftClassPanel = (callback) => {
    callback();
    $('#classMenu').toggleClass('hidden');
};

export { toggleLinesZIndex, toggleLinesVisibility, toggleLeftClassPanel };
