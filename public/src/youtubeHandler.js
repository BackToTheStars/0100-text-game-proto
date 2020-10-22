
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        //console.log('Script loaded.');

        function onYouTubeIframeAPIReady() {
            //console.log('Youtube iFrameAPI ready.');
            var player = new YT.Player('youtube_vid', {
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }
            });
        }

        function onPlayerReady(event) {
            event.target.playVideo();
        }

        function onPlayerStateChange(event) {
            if (event.data == YT.PlayerState.PAUSED) {
                //console.log("Paused");
            }

            if (event.data == YT.PlayerState.PLAYING) {
                //console.log("Playing");
            }

            if (event.data == YT.PlayerState.ENDED) {
                end();
            }
        }