var grid = {};
var colours = {}
var template;
var isGrid = false;
async function init() {
  $("#templateInput input").val(getParameterByName("t"));
  $("#templateInput input").on("change", async () => {
    $("#templateInput input").val($("#templateInput input").val().match(new RegExp(/(?<=\?t=)[^$]+/))[0]);
    if($("#templateInput input").val() != "") {
      window.history.pushState({}, '', '/?t='+$("#templateInput input").val())
      const templateResponse = await fetch('/template/'+$("#templateInput input").val());
      template = await templateResponse.json();
      drawTemplate();
    }
  })
  if(getCookie("soundOn") != "") $("#soundCheckbox > input").prop('checked', getCookie("soundOn") != "false");
  if(getCookie("soundPick") != "") {
    soundpick = Number(getCookie("soundPick"));
    $("#soundSelect > select").val(getCookie("soundPick"));
  }
  if(getCookie("isGrid") != "") {
    isGrid = getCookie("isGrid");
    $("#gridCheckbox > input").prop('checked', getCookie("isGrid") != "false");
  }

  const colourResponse = await fetch('/colours');
  colours = await colourResponse.json();
  //console.log(colours);
  Object.values(colours).forEach((colour, index) => {
    var colourElem = document.querySelector(".colour[data-colour=\""+index+"\"]");
    colourElem.style.backgroundColor = "#"+colour.hex;
    colourElem.setAttribute("title", colour.name);
    colourElem.addEventListener("click", () => { setColour(index, colour.hex, colourElem) });
  });

  const modResponse = await fetch('/isMod');
  const modJSON = await modResponse.json();
  if(modJSON.isMod) {
    document.getElementById("modCheckbox").style.visibility = "visible";
    document.getElementById("modCheckbox").style.display = "inline-block";
  }

  const timeoutResponse = await fetch('/timeout');
  const timeoutJSON = await timeoutResponse.json();
  if(timeoutJSON.auth != false) {
    if(timeout == undefined) {
      timeout = 0;
    } else {
      timeout = timeoutJSON.timeout;
    }
    $("#loginPlease").hide();
    $("#sidebar").addClass("logout");
    
    $("#onlineMembers").show();
    var socket = io.connect();
    socket.on('counter', function (data) {
      $("#onlineMembers").text(data.count + " online");
    });
  } else {
    $("#onlineMembers").hide();
    $("#loginPlease").show();
    $("#sidebar").removeClass("logout");
  }

  const gridResponse = await fetch('/grid');
  grid = await gridResponse.json();
  //console.log(grid);
  drawGrid();
  setInterval(async () => {
    const gridResponse = await fetch('/grid');
    grid = await gridResponse.json();
    //console.log(grid);
    drawGrid();

    const timeoutResponse = await fetch('/timeout');
    const timeoutJSON = await timeoutResponse.json();
    if(timeoutJSON.auth != false) {
      if(timeout == undefined) {
        timeout = 0;
      } else {
        timeout = timeoutJSON.timeout;
      }
    }
  }, 1000)

  if(getParameterByName("t") != null) {
    const templateResponse = await fetch('/template/'+getParameterByName("t"));
    template = await templateResponse.json();
    drawTemplate();
  }
}
init();

function getParameterByName( name ){
  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+name+"=([^&#]*)";
  var regex = new RegExp( regexS );
  var results = regex.exec( window.location.href );
  if( results == null )
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}

function msToTime(duration) {
    var milliseconds = parseInt((duration%1000)/100)
        , seconds = parseInt((duration/1000)%60)
        , minutes = parseInt((duration/(1000*60))%60)

    //minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return minutes + ":" + seconds;
}

async function setPixel(x, y, colour) {
  var opts = {
    x: x,
    y: y,
    c: colour,
    mod: $("#modCheckbox > input").is(':checked')
  }
  $.post("setColour", opts, function(data, status){
    //console.log(data);
    if(data.status <= 1) {
      //console.log(Date.parse(data.timeout))
      timeout = data.timeout;
    }
    if(data.status == 0) {
      if(grid[x] == undefined) grid[x] = {};
      grid[x][y] = colour;
      drawGrid();
    }
  });
}
$("#soundCheckbox > input").on("change", () => {
  setCookie("soundOn", $("#soundCheckbox > input").is(':checked'), 365)
})

$("#soundSelect > select").on("change", () => {
  setCookie("soundPick", Number($("#soundSelect > select").val()), 365)
  soundpick = Number($("#soundSelect > select").val())
})

$("#gridCheckbox > input").on("change", () => {
  setCookie("isGrid", $("#gridCheckbox > input").is(':checked'), 365)
  isGrid = $("#gridCheckbox > input").is(':checked');
  if(zoomed && isGrid) {
    $("#grid").css({ display: "block" })
  } else {
    $("#grid").css({ display: "none" })
  }
})

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

var sounds = ['sounds/notify.wav', 'sounds/mgs.mp3', 'sounds/honk.mp3', 'sounds/bob.wav', 'sounds/thud.wav']
var soundpick;

var timeout = 0;
var notified = true;
setInterval(() => {
  if(timeout > 0) {
    notified = false;
    document.getElementById("timeout").style.visibility = "visible";
    //console.log(getTimeRemaining(timeout).minutes + ":" + getTimeRemaining(timeout).seconds)
    document.getElementById("timeout").innerText = msToTime(timeout);
    document.title = "r/region ["+msToTime(timeout)+"]";
    timeout -= 100;
  } else {
    if(notified != true && $("#soundCheckbox > input").is(':checked')) {
      var sound = new Howl({
        src: [sounds[soundpick]]
      });
      sound.play();
    }
    notified = true;
    document.getElementById("timeout").style.visibility = "hidden";
    document.title = "r/region"
  }
}, 100)

var offset = [0,0];
var canvasCont = document.getElementById ("canvas");
var canvasMove = document.getElementById ("canvasMove");

var canvas = document.getElementById ("pixelCanvas");
var ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = true;

var canvasTemplate = document.getElementById ("templateCanvas");
var ctxTemplate = canvasTemplate.getContext("2d");
ctxTemplate.imageSmoothingEnabled = true;

var isDown = false;
var isMove = false;
var wasDown = false;
var wasMove = false;

canvasCont.addEventListener('mousedown', function(e) {
  if(e.which === 3 || e.button === 2) { e.preventDefault() };
  isDown = (e.which === 3 || e.button === 2);
  wasDown = false;
  offset = [
    canvasMove.offsetLeft - e.clientX,
    canvasMove.offsetTop - e.clientY
  ];
}, true);
canvasCont.addEventListener('touchstart', function(e) {
  isDown = true;
  wasDown = false;
  offset = [
    canvasMove.offsetLeft - e.touches[0].clientX,
    canvasMove.offsetTop - e.touches[0].clientY
  ];
}, true);

var gridRef = [0, 0];
document.addEventListener('mousemove', function(e) {
  move(e)
  drag(e)
}, true);
document.addEventListener('touchmove', function(e) {
  move(e.touches[0])
  drag(e.touches[0])
}, true);
function move(e) {
  gridRef = [];
  var childPos = $(canvasMove).offset();
  var parentPos = $(canvasCont).offset();
  var childOffset = {
      top: childPos.top - parentPos.top,
      left: childPos.left - parentPos.left
  }
  if(zoomed) {
    if(window.innerWidth <= 720) {
      gridRef = [
        Math.ceil((e.clientX - childOffset.left - 15)/20) -1,
        Math.ceil((e.clientY - childOffset.top - 15)/20) -1
      ];
    } else {
      gridRef = [
        Math.ceil((e.clientX - childOffset.left - 271)/20) -1,
        Math.ceil((e.clientY - childOffset.top - 15)/20) -1
      ];
    }
    $("#pixelPreview").css({ left: (gridRef[0]*20), top: (gridRef[1]*20)+"px" })
  } else {
    if(window.innerWidth <= 720) {
      gridRef = [
        Math.ceil((e.clientX - childOffset.left - 15)/2) -1,
        Math.ceil((e.clientY - childOffset.top - 15)/2) -1
      ];
    } else {
      gridRef = [
        Math.ceil((e.clientX - childOffset.left - 271)/2) -1,
        Math.ceil((e.clientY - childOffset.top - 15)/2) -1
      ];
    }
    $("#pixelPreview").css({ left: (gridRef[0]*2), top: (gridRef[1]*2)+"px" })
  }
  //console.log(gridRef)
  document.getElementById("position").innerText = gridRef.join(", ");
}

document.addEventListener('mouseup', function(e) {
  if(e.which === 3 || e.button === 2) { e.preventDefault(); e.stopPropagation(); };
  if(!isMove && zoomed && (e.target.id == "pixelPreview" || e.target.id == "canvas") && (e.button == 0 || e.which == 1)) {
    setPixel(gridRef[0], gridRef[1], e.srcElement.getAttribute('data-colour'))
  }
  if(isMove) {
    wasMove = true;
    setTimeout(() => { wasMove = false; },100)
  }
  isDown = false;
  isMove = false;
  wasDown = true;
  setTimeout(() => { wasDown = false; },100)
}, true);
document.addEventListener('touchend', function(e) {
  if(!isMove && e.srcElement.id == "pixelPreview") {
    setPixel(gridRef[0], gridRef[1], e.srcElement.getAttribute('data-colour'))
  }
  isDown = false;
  isMove = false;
}, true);


function drag(e) {
  if (isDown) {
    isMove = true;
    var maxLeft = $('#canvas').innerWidth() - $('#canvasMove').outerWidth()
    var maxTop = $('#canvas').innerHeight() - $('#canvasMove').outerHeight()
    if(maxLeft > 0) canvasMove.style.left = Math.clamp(e.clientX + offset[0], 0, maxLeft) + 'px';
    if(maxLeft <= 0) canvasMove.style.left = Math.clamp(e.clientX + offset[0], maxLeft, 0) + 'px';
    if(maxTop > 0) canvasMove.style.top = Math.clamp(e.clientY + offset[1], 0, maxTop) + 'px';
    if(maxTop <= 0) canvasMove.style.top = Math.clamp(e.clientY + offset[1], maxTop, 0) + 'px';
  }
}
window.addEventListener('resize', function(e) {
  var maxLeft = $('#canvas').innerWidth() - $('#canvasMove').outerWidth()
  var maxTop = $('#canvas').innerHeight() - $('#canvasMove').outerHeight()
  if(maxLeft > 0) canvasMove.style.left = Math.clamp(canvasMove.offsetLeft, 0, maxLeft) + 'px';
  if(maxLeft <= 0) canvasMove.style.left = Math.clamp(canvasMove.offsetLeft, maxLeft, 0) + 'px';
  if(maxTop > 0) canvasMove.style.top = Math.clamp(canvasMove.offsetTop, 0, maxTop) + 'px';
  if(maxTop <= 0) canvasMove.style.top = Math.clamp(canvasMove.offsetTop, maxTop, 0) + 'px';
}, true);

Math.clamp=function(a,b,c){return Math.max(b,Math.min(c,a));};

var zoomed = false
function zoomToggle() {
  var newPos = []
  if(zoomed) {
    newPos[0] = -(canvasMove.offsetLeft - $(canvasCont).innerWidth()/2)/20
    newPos[1] = -(canvasMove.offsetTop - $(canvasCont).innerHeight()/2)/20
    canvasMove.style.width = "2000px";
    canvasMove.style.height = "2000px";
    $('#zoomToggle').text("zoom_in");
    $("#pixelPreview").removeClass("big")

  } else {
    newPos[0] = -(canvasMove.offsetLeft - $(canvasCont).innerWidth()/2)/2
    newPos[1] = -(canvasMove.offsetTop - $(canvasCont).innerHeight()/2)/2
    canvasMove.style.width = "20000px";
    canvasMove.style.height = "20000px";
    $('#zoomToggle').text("zoom_out");
    $("#pixelPreview").addClass("big")
  }

  zoomed = !zoomed

  //console.log(newPos);
  
  if(zoomed && isGrid) {
    $("#grid").css({ display: "block" })
  } else {
    $("#grid").css({ display: "none" })
  }

  pickLocation(newPos[0], newPos[1])
}

function drawGrid(){
  // Clear screen to white.
  ctx.fillStyle = "white";
  ctx.fillRect(0,0,1000,1000);
  for(var x = 0; x < 1000; x++) {
    if(grid[x] == undefined) continue;
    for(var y=0; y < 1000; y++) {
      if(grid[x][y] == undefined) continue;
      ctx.fillStyle = "#" + colours[grid[x][y]].hex;
      ctx.fillRect( x, y, 1, 1 );
    }
  }
}
function drawTemplate(){
  if(template == undefined) return;
  ctxTemplate.clearRect(0,0,4000,4000);
  for(var x = 0; x < 1000; x++) {
    if(template.grid[x.toString()] == undefined) continue;
    for(var y=0; y < 1000; y++) {
      if(template.grid[x.toString()][y.toString()] == undefined) continue;
      ctxTemplate.fillStyle = "#" + colours[template.grid[x.toString()][y.toString()]].hex;
      ctxTemplate.fillRect( template.x*4+x*4+1, template.y*4+y*4+1, 2, 2 );
    }
  }
}

function setColour(index, hex, elem) {
  $("#pixelPreview").css({ background: "#"+hex })
  $("#pixelPreview").attr("data-colour", index);
  $(".colour.selected").removeClass("selected");
  $(elem).addClass("selected");
}

function pickLocation(x, y) {
  var goto = [x+0.5, y+0.5]
  if(zoomed) {
    canvasMove.style.left = $(canvasCont).innerWidth()/2-goto[0]*20+"px"
    canvasMove.style.top = $(canvasCont).innerHeight()/2-goto[1]*20+"px"
  } else {
    canvasMove.style.left = $(canvasCont).innerWidth()/2-goto[0]*2+"px"
    canvasMove.style.top = $(canvasCont).innerHeight()/2-goto[1]*2+"px"
  }
  var maxLeft = $('#canvas').innerWidth() - $('#canvasMove').outerWidth()
  var maxTop = $('#canvas').innerHeight() - $('#canvasMove').outerHeight()
  if(maxLeft > 0) canvasMove.style.left = Math.clamp(canvasMove.offsetLeft, 0, maxLeft) + 'px';
  if(maxLeft <= 0) canvasMove.style.left = Math.clamp(canvasMove.offsetLeft, maxLeft, 0) + 'px';
  if(maxTop > 0) canvasMove.style.top = Math.clamp(canvasMove.offsetTop, 0, maxTop) + 'px';
  if(maxTop <= 0) canvasMove.style.top = Math.clamp(canvasMove.offsetTop, maxTop, 0) + 'px';
}

function discordWhy() {
  $("#discordWhy").toggleClass("open");
}

// all <a> tags containing a certain rel=""
$("a[rel~='keep-params']").click(function(e) {
    e.preventDefault();

    var params = window.location.search,
        dest = $(this).attr('href') + params;

    // in my experience, a short timeout has helped overcome browser bugs
    window.setTimeout(function() {
        window.location.href = dest;
    }, 100);
});