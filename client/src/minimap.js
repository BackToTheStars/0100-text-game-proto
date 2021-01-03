
// удалить этот файл? (перешли на сервер и Selenium для захвата изображения экрана)

export class MiniMap {                                     // захватываем область экрана и делаем её скриншот
    constructor(rootToAppend) {
        this.rootToAppend = document.getElementById(rootToAppend);
        this.videoEl = document.createElement('video');
        //this.videoEl.controls = true;
        this.videoEl.autoplay = true;
        this.btnStart = document.createElement('button');
        this.btnStart.innerText = 'Start';
        this.btnStop = document.createElement('button');
        this.btnStop.innerText = 'Stop';
        this.btnStart.addEventListener('click', () => { this.startCapturing() }, false);
        this.btnStop.addEventListener('click', () => { this.stopCapturing() }, false);

        // this.rootToAppend.appendChild(this.videoEl);
        // this.rootToAppend.appendChild(this.btnStart);
        // this.rootToAppend.appendChild(this.btnStop);
    }

    async startCapturing() {
        const displayMediaOptions = {                                      // хранит настройки 
            audio: false,
            video: {
                cursor: 'never',
                displaySurface: 'browser',
                logicalSurface: false,
            }
        };
        this.captureStream = null;
        try {
            this.captureStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
            this.videoEl.srcObject = this.captureStream;
            this.dumpOptionsInfo();
        } catch (err) {
            console.error(`Error: ${err}`);
            // @todo: сделать глобальный обработчик ошибок? С выводом в игровую консоль
        }
    }

    dumpOptionsInfo() {
        const videoTrack = this.captureStream.getVideoTracks()[0];

        console.info("Track settings:");
        console.info(JSON.stringify(videoTrack.getSettings(), null, 2));
        console.info("Track constrains:");
        console.info(JSON.stringify(videoTrack.getConstraints(), null, 2));
    }

    async stopCapturing() {
        let tracks = this.captureStream.getTracks();
        tracks.forEach(it => it.stop());
        this.videoEl.srcObject = null;
    }
}
















