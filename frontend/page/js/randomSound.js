var index_size_sounds = 30;
var soundBucketName = 'fristajl-prod-sounds';
var region = 'eu-central-1';

var video = document.getElementById('tiktok-video');
var player = document.getElementById("audioplayer");
var soundplayer = document.getElementById("soundplayer"); // Get audio element

soundplayer.addEventListener('ended',endedHandler,false);
function endedHandler(e) {
    player.play();
}

soundplayer.addEventListener('pause', (event) => {
    console.log('The Boolean paused property is now false. Either the ' +
    'play() method was called or the autoplay attribute was toggled.');
    player.play();  // Pause song
});

soundplayer.addEventListener('play', (event) => {
    console.log('The Boolean paused property is now false. Either the ' +
    'play() method was called or the autoplay attribute was toggled.');
    player.pause();  // Pause song
    video.pause();   // Pause TikTok
  });


readFile("https://" + soundBucketName + ".s3." + region + ".amazonaws.com/index", readIndex, index_size_sounds)

function readIndex(rawFile, index_sound){
    return function() {
        if(rawFile.readyState === 4){
            if(rawFile.status === 200 || rawFile.status == 0){
                index_sound = parseInt(rawFile.responseText, 10);
            }
        }
    }
}

function readFile(file, callback, index_sound)
{
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = callback(rawFile, index_sound);
    rawFile.send(null);
}

soundplayer.autoplay=false;
function randomSound(){
    selection = Math.floor(Math.random() * index_size_sounds);
    soundplayer.src = "https://" + soundBucketName + ".s3." + region + ".amazonaws.com/" + selection + ".mp3"
    soundplayer.play();
}
