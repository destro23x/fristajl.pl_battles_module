var index_size_beats = 100;
var index_size_beats_oldschool = 10;
var dynamic_index = 0;
var beatBucketName = 'fristajl-prod-beats';
var region = 'eu-central-1';
var beatType = document.getElementById("beatType");

readFile("https://" + beatBucketName + ".s3." + region + ".amazonaws.com/index", readIndex, index_size_beats)
readFile("https://" + beatBucketName + ".s3." + region + ".amazonaws.com/oldschool/index", readIndex, index_size_beats_oldschool)

function readIndex(rawFile, index_beat){
    return function() {
        if(rawFile.readyState === 4){
            if(rawFile.status === 200 || rawFile.status == 0){
                index_beat = parseInt(rawFile.responseText, 10);
            }
        }
    }
}

function readFile(file, callback, index_beat)
{
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = callback(rawFile, index_beat);
    rawFile.send(null);
}

AWS.config.region = region;
AWS.config.update({accessKeyId: 'AKIA2P5GFAMSD5JQN247', secretAccessKey: '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', region: region});
var s3 = new AWS.S3();

var lastSong = null;
var selection = null;
var player = document.getElementById("audioplayer"); // Get audio element
player.autoplay=true;
player.addEventListener("ended", selectRandom); // Run function when the song ends

function selectRandom(){
    beatType = document.getElementById("beatType");
    switch (beatType.value) {
    case '':
        // console.log('Trap');
        dynamic_index = index_size_beats;
        break;
    case 'oldschool/':
        // console.log('Oldschool');
        dynamic_index = index_size_beats_oldschool;
        break;
    default:
        console.log(`Sorry, we are out of beats`);
    }
    while(selection == lastSong){ // Repeat until a different song is selected
        selection = Math.floor(Math.random() * dynamic_index);
    }
    lastSong = selection; // Remember the last song
    player.src = "https://" + beatBucketName + ".s3." + region + ".amazonaws.com/" + beatType.value + selection + ".mp3"
    var params = {
        Bucket: beatBucketName, 
        Key: beatType.value + selection + ".mp3"
       };
    s3.getObjectTagging(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else
            // console.log(data.TagSet[1].Value);
            var paragraph = document.getElementById("beat");
            paragraph.textContent = data.TagSet[1].Value.slice(0, -4)
    });
}

selectRandom(); // Select initial song
player.play();  // Start song
