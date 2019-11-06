var express  = require('express')
  , session  = require('express-session')
  , passport = require('passport')
  , app      = express();


var DiscordStrategy = require('passport-discord').Strategy
  , GoogleStrategy = require('passport-google-oauth').OAuth2Strategy

passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

var dScopes = ['identify', 'email'];
var gScopes = ['email', 'profile', 'openid'];

var discordStrat = new DiscordStrategy({
    clientID: '640258963543425034',
    clientSecret: '4iYvy2tx9O3aYtkyDPh8kaowfK1EDLw9',
    callbackURL: 'https://www.region.ml/auth/discord/callback'
},
function(accessToken, refreshToken, profile, done) {
  process.nextTick(function() {
      return done(null, profile);
  });
});

var googleStrat = new GoogleStrategy({
  clientID: "371166401878-f5rvneknvch6ne4vtb0u75koh2nukcpc.apps.googleusercontent.com",
  clientSecret: "92__vhIR_dtmFa9l9uYuhA1N",
  callbackURL: "https://www.region.ml/auth/google/callback",
  scope: gScopes
},
function(accessToken, refreshToken, profile, done) {
  process.nextTick(function() {
      return done(null, profile);
  });
}
)

passport.use(discordStrat);
passport.use(googleStrat);

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static("public"))

var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json())

var mcache = require('memory-cache');
var cache = (duration) => {
  return (req, res, next) => {
    let key = '__express__' + req.originalUrl || req.url
    let cachedBody = mcache.get(key)
    if (cachedBody) {
      res.send(cachedBody)
      return
    } else {
      res.sendResponse = res.send
      res.send = (body) => {
        mcache.put(key, body, duration * 1000);
        res.sendResponse(body)
      }
      next()
    }
  }
}

app.get('/auth/discord', passport.authenticate('discord', { scope: dScopes }), function(req, res) {});
app.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/fail' }), function(req, res) { req.user.type = "d"; res.redirect('/') } // auth success
);
app.get('/auth/google', passport.authenticate('google', { scope: gScopes }), function(req, res) {});
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }), function(req, res) { req.user.type = "g"; res.redirect('/') } // auth success
);
app.get('/auth/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});
app.get('/auth/info', checkAuth, function(req, res) {
    //console.log(req.user)
    res.json(req.user);
});


function checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.send({ auth: false });
}

app.get('/', function(req, res) {
  res.sendFile(__dirname + "/index.html");
});
app.get('/colours', function(req, res) {
  res.send(colours);
});

app.post('/setColour', function(req, res) {
  if(!req.isAuthenticated()) {
    return res.send({ status: 3 });
  }
  if(pixelCounts[req.user.type+req.user.id] == undefined) {
    pixelCounts[req.user.type+req.user.id] = 0;
  }
  if(timeouts[req.user.type + req.user.id] == undefined || new Date(timeouts[req.user.type + req.user.id]) < new Date()) {
    var body = req.body;
    //console.log(req)
    if(body.x < 0 || body.y < 0 || body.x > 999 || body.y > 999 || colours[body.c] == undefined)
      return res.send({ status: 2 });

    timeouts[req.user.type + req.user.id] = AddMinutesToDate(new Date(), 1)
    
    pixelCounts[req.user.type+req.user.id] += 1;
    if(req.user.type == "d") { setPixelRole(req.user.id, pixelCounts[req.user.type+req.user.id]) };
    
    if(grid[body.x] == undefined) { grid[body.x] = {} }
    if(grid[body.x][body.y] == body.c || (grid[body.x][body.y] == undefined && body.c == 0)) { return res.send({ status: 4 }); }
    grid[body.x][body.y] = body.c;
    //console.log(grid[body.x][body.y]);
    res.send({ status: 0, timeout: timeouts[req.user.type + req.user.id] })
  } else {
    res.send({ status: 1, timeout: timeouts[req.user.type + req.user.id] })
  }
});
app.get('/timeout', checkAuth, function(req, res) {
  res.send({ timeout: timeouts[req.user.type + req.user.id] });
});

app.get('/grid', cache(1), function(req, res) {
  res.send(grid);
});

app.listen(8080, function (err) {
    if (err) return console.log(err)
    console.log('Listening at 8080')
})

//Canvas Stuff
const colours = [
  {name: "White", hex: "ffffff"}, {name: "Light Grey", hex: "e4e4e4"}, {name: "Dark Grey", hex: "888888"}, {name: "Black", hex: "000000"},
  {name: "Pink", hex: "ffa7d1"}, {name: "Red", hex: "e50000"}, {name: "Orange", hex: "e59500"}, {name: "Brown", hex: "a06a42"}, 
  {name: "Yellow", hex: "e5d900"}, {name: "Light Green", hex: "94e044"}, {name: "Green", hex: "02be01"}, {name: "Aqua-Blue", hex: "00d3dd"},
  {name: "Green-Blue", hex: "0083c7"}, {name: "Blue", hex: "0000ea"}, {name: "Violet", hex: "cf6ee4"}, {name: "Purple", hex: "820080"}
];

var grid = require("./grid.json");
var pixelCounts = require("./pixelCounts.json");

var fs = require("fs");

var serverUp = true;
function exitHandler(options, err) {
  if(!serverUp){return;}
  serverUp = false;
  if(err) {
    console.error(err);
  }
  fs.writeFileSync('grid.json', JSON.stringify(grid));
  fs.writeFileSync('pixelCounts.json', JSON.stringify(pixelCounts));
  fs.writeFileSync('timeouts.json', JSON.stringify(timeouts));
  //console.log("debug");
  process.exit();   // Don't think you'll need this line any more
}

setInterval(() => {
  fs.writeFileSync('grid.json', JSON.stringify(grid));
  fs.writeFileSync('timeouts.json', JSON.stringify(timeouts));
  fs.writeFileSync('pixelCounts.json', JSON.stringify(pixelCounts));
}, 10000)

//do something when app is closing
process.on('exit', exitHandler.bind(null));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null));

var timeouts = require("./timeouts.json");

function AddMinutesToDate(date,  minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

// Pixel Sorter Bot
var Discord = require("discord.js");
var client = new Discord.Client();
client.login("NjQxMzI4NjYwNjE1NTI4NTAw.XcHauw.SmlCesMgfUjw9fqReG2z13tiC3o")
client.once("ready", () => {
  client.user.setPresence({ game: { name: 'https://www.region.ml', type: "PLAYING", url: "https://www.region.ml" }, status: 'online' })
  console.log("Pixel Sorter Connected")
  Object.keys(pixelCounts).forEach((key) => {
    if(key.startsWith("d")) {
      setPixelRole(key.substr(1), pixelCounts[key])
    }
  })
})

function setPixelRole(userId, pixelCount) {
  if(client.guilds.get("640463635709296640") != undefined) {
    if(client.guilds.get("640463635709296640").members.get(userId) != undefined) {
      var user = client.guilds.get("640463635709296640").members.get(userId)
      if(pixelCount >= 0) client.guilds.get("640463635709296640").members.get(userId).addRole("641317549732134975")
      if(pixelCount >= 1) client.guilds.get("640463635709296640").members.get(userId).addRole("641315857850695680")
      if(pixelCount >= 10) client.guilds.get("640463635709296640").members.get(userId).addRole("641315766448160768")
      if(pixelCount >= 50) client.guilds.get("640463635709296640").members.get(userId).addRole("641315787734515731")
      if(pixelCount >= 100) client.guilds.get("640463635709296640").members.get(userId).addRole("641315812891951124")
      if(pixelCount >= 500) client.guilds.get("640463635709296640").members.get(userId).addRole("641315847499022351")
      if(pixelCount >= 1000) client.guilds.get("640463635709296640").members.get(userId).addRole("641315818868834304")
      if(pixelCount >= 10000) client.guilds.get("640463635709296640").members.get(userId).addRole("641316004936548353")
    }  
  }
}
