var reading = false;
var timer = false;
function sayInChinese(text, rate) {
    if (!reading) {
        speechSynthesis.cancel();
        if (timer) {
            clearInterval(timer);
        }
        let msg = new SpeechSynthesisUtterance();
        msg.voiceURI = 'native';
        msg.volume = 1; // 0 to 1
        msg.rate = rate; // 0.1 to 10
        msg.pitch = 1; //0 to 2
        msg.text = text;
        msg.lang = 'zh-CN';

        msg.onerror = function (e) {
            speechSynthesis.cancel();
            reading = false;
            clearInterval(timer);
        };

        msg.onpause = function (e) {
        };

        msg.onboundary = function (event) {
        };

        msg.onend = function (e) {
            speechSynthesis.cancel();
            reading = false;
            clearInterval(timer);
        };

        speechSynthesis.onerror = function (e) {
            speechSynthesis.cancel();
            reading = false;
            clearInterval(timer);
        };

        console.log(msg);
        speechSynthesis.speak(msg);

        timer = setInterval(function () {
            if (speechSynthesis.paused) {
                speechSynthesis.resume();
            }

        }, 100);
        reading = true;
    }
}

// I'm doing this because I don't understand the right way to set the "onclick"
// for the say button.
// https://stackoverflow.com/a/23296263
window.sayInChinese = sayInChinese

var pinyin = require("chinese-to-pinyin")

// https://www.sitepoint.com/jquery-document-ready-plain-javascript/
document.addEventListener("DOMContentLoaded", function(){
  // Handler when the DOM is fully loaded
  cardWords = document.getElementsByClassName("card-word");
  for(i = 0; i < cardWords.length ; i++) {
    cardWords[i].innerHTML = cardWords[i].innerHTML + " (" + pinyin(cardWords[i].innerHTML) + ")"
  }
});
