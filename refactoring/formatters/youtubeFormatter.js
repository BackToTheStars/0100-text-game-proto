
/* 
Функция преобразования адреса видео youtube, чтобы оно нормально проигрывалось в плеере youtube 
добавляет строку "embed/"

Варианты адресов:
    https://www.youtube.com/embed/Lo9SOZr5aQU
    https://www.youtube.com/watch?v=Lo9SOZr5aQU
    https://youtu.be/Lo9SOZr5aQU

*/


function youtubeFormatter(videoAddress) {
    
    const address = videoAddress.slice(videoAddress.lastIndexOf('?v=') + 3);   
    
    // let address = videoAddress.match(/watch\?v=/);
    // if (address) {
    //     address = `${videoAddress.substring(0, m.index)}embed/${videoAddress.substring(m.index + 8)}`;
    // } else {
    //     address = videoAddress;
    // }

    console.log(address);
    return address;
};



export { youtubeFormatter }



