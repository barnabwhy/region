var colours = {};
var coloursHex = {};
var grid = {};
var pixelGrid = {};

async function init() {
  const colourResponse = await fetch('/colours');
  coloursJSON = await colourResponse.json();
  console.log(coloursJSON)
  coloursHex = coloursJSON;
  colours = coloursJSON.map((c) => { return hexToRgb("#"+c.hex); });
  console.log(colours);

  const gridResponse = await fetch('../grid');
  pixelGrid = await gridResponse.json();
  console.log(pixelGrid);
  drawGrid();
}
init();

var coordX = 0;
var coordY = 0;
var image;

document.getElementById("file-upload").addEventListener("change", evt => {
  var f = evt.target.files[0];
  if (!f.type.match("image.*")) {
    return;
  }
  var reader = new FileReader();
  // Closure to capture the file information.
  reader.onload = (function(theFile) {
    return function(e) {
      // Render thumbnail.
      console.log(e.target.result);
      var img1 = new Image();
      //drawing of the test image - img1
      img1.onload = function () {
        //draw background image
        image = img1;
        drawTemplate(image);
        $("#coordX").on("change", () => { drawTemplate(image) })
        $("#coordY").on("change", () => { drawTemplate(image) })

        document.getElementById("uploadImg").style.display = "none"
      };
      img1.src = e.target.result;
    };
  })(f);
  // Read in the image file as a data URL.
  reader.readAsDataURL(f);
})

var canvas = document.getElementById("templateCreateCanvas");
var ctxTemplate = canvas.getContext("2d");
var pixelCanvas = document.getElementById("pixelCanvas");
var ctx = pixelCanvas.getContext("2d");


function drawGrid(){
  // Clear screen to white.
  ctx.fillStyle = "white";
  ctx.fillRect(0,0,1000,1000);
  for(var x = 0; x < 1000; x++) {
    if(pixelGrid[x] == undefined) continue;
    for(var y=0; y < 1000; y++) {
      if(pixelGrid[x][y] == undefined) continue;
      ctx.fillStyle = "#" + coloursHex[pixelGrid[x][y]].hex;
      ctx.fillRect( x, y, 1, 1 );
    }
  }
}
function drawTemplate(image) {
  if(image != undefined) {
    if(image.width > 256 || image.height > 256) return;
    ctxTemplate.clearRect(coordX,coordY,image.width,image.height)
    ctxTemplate.drawImage(image, 0, 0);
    // load all pixels into an array
    var imageData = ctxTemplate.getImageData(0, 0, image.width, image.height);

    coordX = document.getElementById("coordX").value;
    coordY = document.getElementById("coordY").value;

    var data = imageData.data;

    // rewrite all pixels using only the mapped colors
    var mappedColor;
    var pixelCount = 0;
    for (var i = 0; i < data.length; i += 4) {
        mappedColor = mapColorToPalette(data[i], data[i + 1], data[i + 2]);
        if (data[i + 3] > 10) {
            data[i] = mappedColor.r;
            data[i + 1] = mappedColor.g;
            data[i + 2] = mappedColor.b;
            pixelCount += 1;
        }
    }

    ctxTemplate.clearRect(0,0,image.width,image.height)

    $("#imageWidth").text("Width: "+image.width)
    $("#imageHeight").text("Height: "+image.height)
    $("#imagePixels").text("Pixels: "+pixelCount)
    ctxTemplate.putImageData(imageData, document.getElementById("coordX").value, document.getElementById("coordY").value);
  }
}

function dist(v1, v2){
  var i,
      d = 0;

  for (i = 0; i < v1.length; i++) {
      d += (v1[i] - v2[i])*(v1[i] - v2[i]);
  }
  return Math.sqrt(d);
};

// use Euclidian distance to find closest color
function mapColorToPalette(red, green, blue) {
    var color, diffDistance, mappedColor;
    var distance = 25000;
    for (var i = 0; i < colours.length; i++) {
        color = colours[i];
        diffDistance = dist([color.r,color.g,color.b],[red,green,blue])
        if (diffDistance < distance) {
            distance = diffDistance;
            mappedColor = colours[i];
        };
    }
    return (mappedColor);
}

function mapColorToPaletteId(red, green, blue) {
  var color, diffDistance, mappedColor;
  var distance = 25000;
  for (var i = 0; i < colours.length; i++) {
      color = colours[i];
      diffDistance = dist([color.r,color.g,color.b],[red,green,blue])
      if (diffDistance < distance) {
          distance = diffDistance;
          mappedColor = i;
      };
  }
  return (mappedColor);
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

var template = {}

function createTemplate() {
  if(image != undefined) {
    var imageData = ctxTemplate.getImageData(coordX, coordY, image.width, image.height);
    // rewrite all pixels using only the mapped colors
    var mappedColor;
    var templateGrid = {};
    
    var data = imageData.data;
    for (var i = 0; i < data.length; i += 4) {
      mappedColor = mapColorToPaletteId(data[i], data[i + 1], data[i + 2]);
      if (data[i + 3] > 10) {
        var x = (i / 4) % image.width;
        var y = Math.floor((i / 4) / image.width);
        if(templateGrid[x.toString()] == undefined) templateGrid[x.toString()] = {};
        templateGrid[x.toString()][y.toString()] = mappedColor
      }
    }
    console.log(templateGrid);
    template = {
      x: coordX,
      y: coordY,
      grid: JSON.stringify(templateGrid)
    }
    console.log(template)
    $.post("/createTemplate", template, function(data){
      //console.log(data);
      if(data.status == 1) {
        alert("Error");
      }
      if(data.status == 0) {
        location.href =  "https://www.region.ml/?t=" + data.url
      }
    });
  }
}

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

var offset = [0,0];
var canvasCont = document.getElementById ("canvas");
var canvasMove = document.getElementById ("canvasMove");

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
  }
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

Math.clamp=function(a,b,c){return Math.max(b,Math.min(c,a));};

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