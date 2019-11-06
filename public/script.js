var grid = {};
var colours = {}
async function init() {
  const colourResponse = await fetch('/colours');
  colours = await colourResponse.json();
  //console.log(colours);
  Object.values(colours).forEach((colour, index) => {
    var colourElem = document.querySelector(".colour[data-colour=\""+index+"\"]");
    colourElem.style.backgroundColor = "#"+colour.hex;
    colourElem.setAttribute("title", colour.name);
    colourElem.addEventListener("click", () => { setColour(index, colour.hex, colourElem) });
  });
  const timeoutResponse = await fetch('/timeout');
  const timeoutJSON = await timeoutResponse.json();
  if(timeoutJSON.auth != false) {
    if(timeout == undefined) {
      timeout = new Date();
    } else {
      timeout = timeoutJSON.timeout;
    }
    $("#loginPlease").hide();
    $("#sidebar").addClass("logout");
  } else {
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
  }, 2500)
}
init();

async function setPixel(x, y, colour) {
  var opts = {
    x: x,
    y: y,
    c: colour
  }
  $.post("setColour", opts, function(data, status){
    //console.log(data);
    if(data.status <= 1) {
      //console.log(Date.parse(data.timeout))
      timeout = data.timeout;
    }
    if(data.status == 0) {
      grid[x][y] = colour;
      drawGrid();
    }
  });
}

var timeout = new Date();
setInterval(() => {
  if(Date.parse(timeout) > new Date()) {
    document.getElementById("timeout").style.visibility = "visible";
    //console.log(getTimeRemaining(timeout).minutes + ":" + getTimeRemaining(timeout).seconds)
    document.getElementById("timeout").innerText = (getTimeRemaining(timeout).minutes + ":" + getTimeRemaining(timeout).seconds.toString().padStart(2, '0'));
  } else {
    document.getElementById("timeout").style.visibility = "hidden";
  }
}, 100)

function getTimeRemaining(endtime){
  var t = new Date(endtime).getTime() - new Date().getTime();
  var seconds = Math.floor( (t/1000) % 60 );
  var minutes = Math.floor( (t/1000/60) % 60 );
  var hours = Math.floor( (t/(1000*60*60)) % 24 );
  var days = Math.floor( t/(1000*60*60*24) );
  return {
    'total': t,
    'days': days,
    'hours': hours,
    'minutes': minutes,
    'seconds': seconds
  };
}

var offset = [0,0];
var canvasCont = document.getElementById ("canvas");
var canvasMove = document.getElementById ("canvasMove");

var canvas = document.getElementById ("pixelCanvas");
var ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = true;

var isDown = false;
var isMove = false;
var wasDown = false;

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
canvas.addEventListener('touchmove', function(e) {
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

document.addEventListener('contextmenu', function (e) {
  if(e.target.id == "pixelPreview" || e.target.id == "canvas") e.preventDefault();
  wasDown = false;
}, false);

document.addEventListener('mouseup', function(e) {
  if(e.which === 3 || e.button === 2) { e.preventDefault(); e.stopPropagation(); };
  if(!isMove && zoomed && (e.target.id == "pixelPreview" || e.target.id == "canvas") && (e.button == 0 || e.which == 1)) {
    setPixel(gridRef[0], gridRef[1], e.srcElement.getAttribute('data-colour'))
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
  event.preventDefault();
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