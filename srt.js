// srt.js
// Kazutaka Kurihara @qurihara

var tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";

var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function loadScript(filename, cb) {
  var script = document.createElement("script");
  script.type = "text/javascript";
  script.src = filename;
  script.onload = cb;

  var firstScript = document.getElementsByTagName("script")[0];
  firstScript.parentNode.insertBefore(script, firstScript);
}

function indexedFunction(func) {
  if (func == null) {
    return null;
  }
  // if (index == -1 || func.length <= index) return null;
  if (index in func) {
    return func[index];
  }
  return null;
}

var index = "-1";
var doOnce = {};
var INTERVAL = 50;
var player;
var autoplay = 0;
var subUrl = "";
var saferMode = false;

function onYouTubeIframeAPIReady() {
  var vid = "wJddRdcr3BE";
  var para = getUrlVars();
  if (para["v"]) {
    vid = para["v"];
  }
  if (para["autoplay"]) {
    autoplay = para["autoplay"];
  }
  if (para["safer"] && (para["safer"] === "true")) {
    saferMode = true;
    console.log("safer eval mode");
  }
  if (para["surl"]) {
    subUrl = para["surl"];
    console.log("subUrl:" + subUrl);
  }

  player = new YT.Player("player", {
    height: "390",
    width: "640",
    videoId: vid,
    // playerVars: { "cc_load_policy": 1},// , "autoplay": autoplay},
    events: {
      "onReady": onPlayerReady,
      "onStateChange": onPlayerStateChange
    }
  });
}

function confirmExtSub() {
  return confirm(
    "公式配布されていないsrt.jsが指定されています。"
    + "読み込んでもよろしいですか？任意のプログラムが実行されるリスクがあります。\n"
    + "Can I load a third party srt.js?　It might be dangerous."
  );
}

function onPlayerReady(event) {
  // event.target.playVideo();

  console.log(event.target.getVideoUrl())
  console.log(event.target.getAvailablePlaybackRates());

  if (subUrl === "") {
    getSub(event.target.getVideoUrl());
  } else {
    if (confirmExtSub() == true) {
      getSubFromUrl(subUrl, function(err) {
        if (err == false) {
          disableDropper();
        }
      });
    }
  }
}

function getSub(url) {
  var httpRequest = new XMLHttpRequest();
  var videoId = url.match(/\?v=([-\w]{11})/)[1];
  httpRequest.onreadystatechange = function() {
    if (httpRequest.readyState === 4 && httpRequest.status === 200) {
      // console.log(a.responseXML.documentElement);
      var f = httpRequest.responseXML.documentElement.getElementsByTagName("track");
      if (f.length) {
        var g = document.createElement("div");
        g.style.cssText = "padding:10px; background:white; border:1px solid #aaa;";
        g.onclick = function() {
          g.parentNode.removeChild(g);
        };

        var first = true;
        for(var e = 0; e < f.length; e++) {
          var d = document.createElement("button");
          d.type = "button";
          d.innerHTML = f[e].getAttribute("lang_original");
          d.style.cssText = "margin:3px;";
          d.value = f[e].getAttribute("lang_code");
          d.dataset.nm = f[e].getAttribute("name");
          g.appendChild(d);

          if (first == true) {
            first = false;
            getFirstSub(d);
          }
        }
        // document.getElementById("ctrl").appendChild(g);
      } else {
        if (!hasSubtitle) {
          // alert("no subtitle!");
        }
      }
    }
      
    function getFirstSub(i) {
      httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === 4 && httpRequest.status === 200) {
          var j = "";
          var l = httpRequest.responseXML.documentElement.getElementsByTagName("p");
          for(var m = 0; m < l.length; m++){
            // console.log(l[m]);
            j += m + 1 + "\n";
            j += formatMilliseconds(Number(l[m].getAttribute("t"))) + " --> " + formatMilliseconds(Number(l[m].getAttribute("t")) + Number(l[m].getAttribute("d"))) + "\n";
            j += l[m].innerHTML + "\n\n";
          }
          parseSrt(j);
          disableDropper();
          // if(autoplay == "true") {
            // player.playVideo();
          // }
        }
      };
      httpRequest.open("GET", "https://www.youtube.com/api/timedtext?fmt=srv3&lang=" + i.value + "&name=" + i.dataset.nm + "&v=" + videoId);
      httpRequest.send(null);
    }
  };
  httpRequest.open("GET", "https://www.youtube.com/api/timedtext?type=list&v=" + videoId);
  httpRequest.send(null);
}

function formatMilliseconds(millisec) {
  var hours = String(Math.floor(millisec / 3600000) + 100).substring(1);
  var min = String(Math.floor((millisec - hours * 3600000) / 60000) + 100).substring(1);
  var sec = String(Math.floor((millisec - hours * 3600000 - min * 60000) / 1000) + 100).substring(1);
  var millisec = String(millisec + 1000).slice(-3);
  return (hours + ":" + min + ":" + sec + "." + millisec);
}

function disableDropper() {
  document.getElementById("drop_zone_sub").style.display = "none";
}

var dropZoneSub = document.getElementById("drop_zone_sub");
dropZoneSub.addEventListener("dragover", handleDragOver, false);
dropZoneSub.addEventListener("drop", handleFileSelectSub, false);

var done = false;

function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PLAYING && !done) {
    timer = setInterval("checkRate()", INTERVAL);
    done = true;
  } else {
    // clearInterval(timer);
  }
}

function handleDragOver(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  evt.dataTransfer.dropEffect = "copy"; // Explicitly show this is a copy.
}

function handleFileSelectSub(evt) {
  evt.stopPropagation();
  evt.preventDefault();

  var f = evt.dataTransfer.files[0];

  var reader = new FileReader();
  reader.readAsText(f, "utf-8");
  reader.onload = function(evt) {
    // console.log(evt.target.result);
    parseSrt(evt.target.result);
    disableDropper();
    // if (autoplay == "true") {
      // player.playVideo();
    // }
  }
  reader.onerror = function(evt) {
    alert("Error ：" + evt.target.error.code);
  }
}


var timer;
var state = -1;

function checkRate() {
  if (player.getPlayerState() == 1) {
    var cur = player.getCurrentTime();
    var newState = isInWhichSub(cur, 0);

    if (state != newState) {
      state = newState;
      index = String(state);
      if (state != -1) {
        action(state);
      }
    }
  }
}

function action(state) {
  console.log(subList[state]);

  if (index in doOnce) {
    console.log("Multiple call: omitted.");
  } else {
    if (saferMode === true) {
      console.log("safer evaluation:")
      evel(subList[state]);
    } else {
      console.log("normal evaluation:")
      eval(subList[state]);
    }
  }
}
