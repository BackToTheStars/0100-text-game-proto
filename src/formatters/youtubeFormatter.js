
/* 
Функция преобразования адреса видео youtube, чтобы оно нормально проигрывалось в плеере youtube 
добавляет строку "embed/"

Варианты адресов:
    https://www.youtube.com/embed/Lo9SOZr5aQU
    https://www.youtube.com/watch?v=Lo9SOZr5aQU
    https://youtu.be/Lo9SOZr5aQU

*/


function youtubeFormatter(videoAddress) {

    if (videoAddress.indexOf('/embed/') !== -1) {
        return videoAddress.slice(videoAddress.lastIndexOf('/embed/') + 7);
    } else if (videoAddress.indexOf('?v=') !== -1) {
        return videoAddress.slice(videoAddress.lastIndexOf('?v=') + 3);
    }
    console.log(`Incorrect youtube url: ${videoAddress}`)
    return ''
    // https://www.youtube.com/embed/fxc3Tv3tV7M

    // const address = videoAddress.slice(videoAddress.lastIndexOf('?v=') + 3);

    // return address;
};



export { youtubeFormatter }



