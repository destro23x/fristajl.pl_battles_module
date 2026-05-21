var pictureBucketName = 'fristajl-prod-pictures';
var region = 'eu-central-1'; // Region
var index_size_pictures = 50;

readFile("https://" + pictureBucketName + ".s3.eu-central-1.amazonaws.com/index", readIndex)

function readFile(file, callback)
{
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = callback(rawFile);
    rawFile.send(null);
}

function readIndex(rawFile){
    return function() {
        if(rawFile.readyState === 4){
            if(rawFile.status === 200 || rawFile.status == 0){
              index_size_pictures = parseInt(rawFile.responseText, 10);
            }
        }
    }
}

function randomImage() {
  index = Math.floor(Math.random() * index_size_pictures);
  var img = new Image();
  img.src = "https://" + pictureBucketName + ".s3." + region + ".amazonaws.com/" + index + ".jpg";
  img_home.replaceChild(img, img_home.firstChild);
}