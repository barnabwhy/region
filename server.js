var express  = require('express')
  , session  = require('express-session')
  , passport = require('passport')
  , app      = express();


var fs = require("fs");

var config = requireSafe("./config.json");

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
  clientID: config.auth.discord.clientID,
  clientSecret: config.auth.discord.clientSecret,
  callbackURL: config.auth.discord.callbackURL
},
function(accessToken, refreshToken, profile, done) {
  process.nextTick(function() {
      return done(null, profile);
  });
});

var googleStrat = new GoogleStrategy({
  clientID: config.auth.google.clientID,
  clientSecret: config.auth.google.clientSecret,
  callbackURL: config.auth.google.callbackURL,
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

app.set('trust proxy', 2)
var sessionMiddleware = session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
})
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static("public"))

var bodyParser = require('body-parser')
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

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

app.get('/auth/discord', (req,res,next) => { req.session.template = req.query.t; next(); }, passport.authenticate('discord', { scope: dScopes }), function(req, res) {});
app.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/' }), function(req, res) { req.user.type = "d"; if(req.session.template) { res.redirect('/?t='+req.session.template); req.session.template = undefined } else { res.redirect('/') } } // auth success
);
app.get('/auth/google', (req,res,next) => { req.session.template = req.query.t; next(); }, passport.authenticate('google', { scope: gScopes }), function(req, res) {});
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }), function(req, res) { req.user.type = "g"; if(req.session.template) { res.redirect('/?t='+req.session.template); req.session.template = undefined } else { res.redirect('/') } } // auth success
);
app.get('/auth/logout', function(req, res) {
    req.logout();
    if(req.query.t) {
      res.redirect('/?t='+req.query.t);
    } else {
      res.redirect('/');
    }
});
app.get('/auth/info', function(req, res) {
  if (!req.isAuthenticated()) {
    res.send({ auth: false });
  } else {
    res.json(req.user);
  }
});

app.get('/', function(req, res) {
  res.sendFile(__dirname + "/index.html");
});
app.get('/colours', function(req, res) {
  res.send(colours);
});

var mods = requireSafe("./mods.json", []);
setInterval(() => {
  mods = requireSafe("./mods.json", []);
}, 30000)

app.post('/setColour', function(req, res) {
  if(!req.isAuthenticated()) {
    return res.send({ status: 3 });
  }
  if(pixelCounts[req.user.type+req.user.id] == undefined) {
    pixelCounts[req.user.type+req.user.id] = 0;
  }
  if(timeouts[req.user.type + req.user.id] == undefined || new Date(timeouts[req.user.type + req.user.id]) < new Date() || (req.body.mod == "true" && mods.indexOf(req.user.type+req.user.id) != -1)) {
    var body = req.body;
    //console.log(req)
    if(body.x < 0 || body.y < 0 || body.x > 999 || body.y > 999 || colours[body.c] == undefined || (grid[body.x] != undefined && grid[body.x][body.y] == body.c) || (grid[body.x] != undefined && grid[body.x][body.y] == undefined && body.c == 0))
      return res.send({ status: 2 });

    if(body.mod != "true" || mods.indexOf(req.user.type+req.user.id) == -1) {
      timeouts[req.user.type+req.user.id] = AddMinutesToDate(new Date(), 1)
      pixelCounts[req.user.type+req.user.id] += 1;
      if(req.user.type == "d") { setPixelRole(req.user.id, pixelCounts[req.user.type+req.user.id]) };
    }

    if(bans.indexOf(req.user.type+req.user.id) != -1) timeouts[req.user.type + req.user.id] = AddMinutesToDate(new Date(), 60)

    if(grid[body.x] == undefined) { grid[body.x] = {} }
    if(grid[body.x][body.y] == body.c || (grid[body.x][body.y] == undefined && body.c == 0)) { return res.send({ status: 4 }); }
    grid[body.x][body.y] = body.c;
    //console.log(grid[body.x][body.y]);
    res.send({ status: 0, timeout: new Date(timeouts[req.user.type + req.user.id]).getTime() - new Date().getTime() })
  } else {
    res.send({ status: 1, timeout: new Date(timeouts[req.user.type + req.user.id]).getTime() - new Date().getTime() })
  }
});
app.get('/timeout', function(req, res) {
  if (!req.isAuthenticated()) {
    res.send({ auth: false });
  } else {
    res.send({ timeout: new Date(timeouts[req.user.type + req.user.id]).getTime() - new Date().getTime() });
  }
});
app.get('/isMod', function(req, res) {
  if (!req.isAuthenticated()) {
    res.send({ isMod: false });
  } else {
    res.send({ isMod: (mods.indexOf(req.user.type+req.user.id) != -1) });
  }
});

app.get('/grid', function(req, res) {
  res.send(grid);
});
app.get('/getPixels/*', cache(1), function(req, res) {
  if(pixelCounts[req.url.split("/")[req.url.split("/").length - 1]] != undefined) {
    res.send({ count: pixelCounts[req.url.split("/")[req.url.split("/").length - 1]] });
  } else {
    res.send({ count: 0 });
  }
});

// Templates
var templates = requireSafe("./templates.json");

app.get('/template', function(req, res) {
  res.sendFile(__dirname + "/template.html");
});
app.post('/createTemplate', function(req, res) {
  var valid = true
  if(!(req.body.x >= 0 && req.body.x <= 999 && req.body.y >= 0 && req.body.y <= 999)) valid = false;
  if(req.body.grid == undefined) valid = false;

  try {
    JSON.parse(req.body.grid)
  } catch(e) {
    valid = false;
  }

  if(valid) {
    var id = create_UUID()
    templates[id] = { x: req.body.x, y: req.body.y, grid: JSON.parse(req.body.grid) };
    res.send({ status: 0, url: id })
  } else {
    res.send({ status: 1 })
  }
});

function create_UUID(){
  var dt = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (dt + Math.random()*16)%16 | 0;
      dt = Math.floor(dt/16);
      return (c=='x' ? r :(r&0x3|0x8)).toString(16);
  });
  return uuid;
}

app.get('/template/*', function(req, res) {
  if(templates[req.url.split("/")[req.url.split("/").length - 1]] == undefined) {
    res.send(undefined);
  } else {
    res.send(templates[req.url.split("/")[req.url.split("/").length - 1]]);
  }
});

var server = require('http').Server(app);
var sharedsession = require("express-socket.io-session");
var io = require('socket.io')(server, { pingTimeout: 5000, pingInterval: 1000 }).use(sharedsession(sessionMiddleware, {
  autoSave:true
})); 
var onlineCount = 0;
var $idsConnected = {};
io.on('connection', function (socket) {
  if(socket.handshake.session && socket.handshake.session.passport && socket.handshake.session.passport.user.id && socket.handshake.session.passport.user.type) {
    var $id = socket.handshake.session.passport.user.type+socket.handshake.session.passport.user.id;
    if (!$idsConnected.hasOwnProperty($id)) {
      $idsConnected[$id] = 1;
      onlineCount++;
      io.emit('counter', {count:onlineCount});
    }
    /* Disconnect socket */
    socket.on('disconnect', function() {
      if ($idsConnected.hasOwnProperty($id)) {
        delete $idsConnected[$id];
        onlineCount--;
        io.emit('counter', {count:onlineCount});
      }
    });
  }
});

server.listen(31082, function (err) {
    if (err) return console.log(err)
    console.log('Listening at 31082')
})

//Canvas Stuff
const colours = [
  {name: "White", hex: "ffffff"}, {name: "Light Grey", hex: "e4e4e4"}, {name: "Dark Grey", hex: "888888"}, {name: "Black", hex: "000000"},
  {name: "Pink", hex: "ffa7d1"}, {name: "Red", hex: "e50000"}, {name: "Orange", hex: "e59500"}, {name: "Brown", hex: "a06a42"},
  {name: "Yellow", hex: "e5d900"}, {name: "Light Green", hex: "94e044"}, {name: "Green", hex: "02be01"}, {name: "Aqua-Blue", hex: "00d3dd"},
  {name: "Green-Blue", hex: "0083c7"}, {name: "Blue", hex: "0000ea"}, {name: "Violet", hex: "cf6ee4"}, {name: "Purple", hex: "820080"}

];

var grid = requireSafe("./grid.json");
var pixelCounts = requireSafe("./pixelCounts.json");

var serverUp = true;
function exitHandler(options, err) {
  if(!serverUp){return;}
  serverUp = false;
  if(err) {
    console.error(err);
  }
  fs.writeFileSync('grid.json', JSON.stringify(grid));
  fs.writeFileSync('pixelCounts.json', JSON.stringify(pixelCounts));
  fs.writeFileSync('templates.json', JSON.stringify(templates));
  fs.writeFileSync('timeouts.json', JSON.stringify(timeouts));
  fs.writeFileSync('pixelDMs.json', JSON.stringify(pixelDMs));
  //console.log("debug");
  process.exit();   // Don't think you'll need this line any more
}

setInterval(() => {
  fs.writeFileSync('grid.json', JSON.stringify(grid));
  fs.writeFileSync('timeouts.json', JSON.stringify(timeouts));
  fs.writeFileSync('templates.json', JSON.stringify(templates));
  fs.writeFileSync('pixelCounts.json', JSON.stringify(pixelCounts));
  fs.writeFileSync('pixelDMs.json', JSON.stringify(pixelDMs));
}, 30000)

//do something when app is closing
process.on('exit', exitHandler.bind(null));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null));

//catches uncaught exceptions
//process.on('uncaughtException', exitHandler.bind(null));

var timeouts = requireSafe("./timeouts.json");

var bans = requireSafe("./bans.json", []);

function AddMinutesToDate(date,  minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

// Pixel Sorter Bot
var Discord = require("discord.js");
var client = new Discord.Client();
client.login(config.bot.token)
client.once("ready", () => {
  client.user.setPresence({ game: { name: 'https://www.region.ml', type: "PLAYING", url: "https://www.region.ml" }, status: 'online' })
  console.log("Pixel Sorter Connected")
  Object.keys(pixelCounts).forEach((key) => {
    if(key.startsWith("d") && client.guilds.get(config.bot.guild).members.get(key.substr(1)) != undefined) {
      setPixelRole(key.substr(1), pixelCounts[key])
    }
  })
})

var pixelDMs = requireSafe("./pixelDMs.json");

client.on('message', msg => {
  if(msg.channel.id == config.bot.pixelChannel) {
    var colourEmojis = config.bot.colourEmojis
    if(colourEmojis.indexOf(msg.content) == -1) msg.delete();
    return
  }

  if(msg.author.bot) return;
  if (msg.content.startsWith('r/leaderboard')) {
    var pixelLeaders = [];
    Object.keys(pixelCounts).forEach((key) => {
      if(key.startsWith("d") && client.guilds.get(config.bot.guild).members.get(key.substr(1)) != undefined) {
        pixelLeaders.push([key.substr(1), pixelCounts[key]])
      }
    })
    pixelLeaders.sort((a,b) => { return b[1]-a[1] })
    pixelLeaders = pixelLeaders.slice(0,10);
    msg.channel.send({
      "embed": {
        "title": "Pixels Leaderboard",
        "color": parseInt(colours[Math.floor(Math.random()*16)].hex,16),
        "timestamp": new Date().now,
        "author": {
          "name": "r/region",
          "url": "https://www.region.ml",
          "icon_url": client.user.avatarURL
        },
        "fields": pixelLeaders.map((u) => { return { "name": client.guilds.get(config.bot.guild).members.get(u[0]).user.username + "#" + client.guilds.get(config.bot.guild).members.get(u[0]).user.discriminator, value: u[1] } })
      }
    });
  }
});
function setPixelRole(userId, pixelCount) {
  if(client.guilds.get(config.bot.guild) != undefined) {
    if(client.guilds.get(config.bot.guild).members.get(userId) != undefined && client.guilds.get(config.bot.guild).members.get(userId).roles.get("641315606938910740") != undefined) {
      var user = client.guilds.get(config.bot.guild).members.get(userId)
      if(pixelCount >= 0) client.guilds.get(config.bot.guild).members.get(userId).addRole(config.bot.roles["0"])
      if(pixelCount >= 1) client.guilds.get(config.bot.guild).members.get(userId).addRole(config.bot.roles["1"])
      if(pixelCount >= 10) client.guilds.get(config.bot.guild).members.get(userId).addRole(config.bot.roles["10"])
      if(pixelCount >= 50) client.guilds.get(config.bot.guild).members.get(userId).addRole(config.bot.roles["50"])
      if(pixelCount >= 100) client.guilds.get(config.bot.guild).members.get(userId).addRole(config.bot.roles["100"])
      if(pixelCount >= 500) client.guilds.get(config.bot.guild).members.get(userId).addRole(config.bot.roles["500"])
      if(pixelCount >= 1000) client.guilds.get(config.bot.guild).members.get(userId).addRole(config.bot.roles["1000"])
      if(pixelCount >= 10000) client.guilds.get(config.bot.guild).members.get(userId).addRole(config.bot.roles["10000"])

      if(pixelDMs[userId] == undefined) pixelDMs[userId] = 0;

      if(pixelDMs[userId] < 1 && pixelCount >= 1) client.guilds.get(config.bot.guild).members.get(userId).user.send("You have placed your first pixel.")
      if(pixelDMs[userId] < 10 && pixelCount >= 10) client.guilds.get(config.bot.guild).members.get(userId).user.send("You have reached 10 pixels.")
      if(pixelDMs[userId] < 50 && pixelCount >= 50) client.guilds.get(config.bot.guild).members.get(userId).user.send("You have reached 50 pixels.")
      if(pixelDMs[userId] < 100 && pixelCount >= 100) client.guilds.get(config.bot.guild).members.get(userId).user.send("You have reached 100 pixels.")
      if(pixelDMs[userId] < 500 && pixelCount >= 500) client.guilds.get(config.bot.guild).members.get(userId).user.send("You have reached 500 pixels.")
      if(pixelDMs[userId] < 1000 && pixelCount >= 1000) client.guilds.get(config.bot.guild).members.get(userId).user.send("You have reached 1000 pixels.")
      if(pixelDMs[userId] < 10000 && pixelCount >= 10000) client.guilds.get(config.bot.guild).members.get(userId).user.send("You have reached 10000 pixels.")

      pixelDMs[userId] = pixelCount;
    }
  }
}

function requireSafe(path, defaultValue) {
  var defaultValue = defaultValue || {};
  try {
    return require(path)
  } catch(e) {
    console.log(e)
    return defaultValue
  }
}