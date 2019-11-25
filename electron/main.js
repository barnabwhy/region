//handle setupevents as quickly as possible
const setupEvents = require('./installers/setupEvents')
if (setupEvents.handleSquirrelEvent()) {
   // squirrel event handled and app will exit in 1000ms, so don't do anything else
   return;
}


// Modules to control application life and create native browser window
const {app, BrowserWindow, dialog} = require('electron')
const path = require('path')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: "r/region",
    backgroundColor: "#ffffff",
    icon: path.join(__dirname, "/icon.png"),
    minHeight: 240,
    minWidth: 320,
    webPreferences: {
      nodeIntegration: false
    },
    show: false
  })

  mainWindow.setMenu(null);

  // and load the index.html of the app.
  mainWindow.loadURL('https://www.region.ml')

  mainWindow.webContents.on('did-finish-load', function() {
    mainWindow.show();
    rpc.login({ clientId }).catch(console.error);
    rpc.connect();
  });
  mainWindow.webContents.on('did-navigate', function(e, url) {
    if(!url.startsWith("https://www.region.ml/")) {
      mainWindow.webContents.executeJavaScript("document.querySelector('head').insertAdjacentHTML( 'beforeend', `<style>@font-face { font-family: 'Material Icons'; font-style: normal; font-weight: 400; src: url(https://fonts.gstatic.com/s/materialicons/v48/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2) format('woff2'); } .material-icons { font-family: 'Material Icons'; font-weight: normal; font-style: normal; font-size: 24px; line-height: 1; letter-spacing: normal; text-transform: none; display: inline-block; white-space: nowrap; word-wrap: normal; direction: ltr; -webkit-font-feature-settings: 'liga'; -webkit-font-smoothing: antialiased; }</style>`);");
      mainWindow.webContents.executeJavaScript("document.body.insertAdjacentHTML( 'beforeend', `<button id='locationBackButtonRegion' style='position: fixed; top: 32px; left: 32px; z-index: 999999999999999999999999999999999999999999999999999999999999999; background: rgba(21,21,21,0.75); box-shadow: 0px 1px 4px rgba(0,0,0,0.75); color: white; padding: 16px; border-radius: 100%' class='material-icons'>arrow_back</button>`); document.getElementById('locationBackButtonRegion').addEventListener('click', () => { window.history.back() });");
      mainWindow.webContents.executeJavaScript("console.log('test')");
    }
    mainWindow.webContents.executeJavaScript("document.querySelector('head').insertAdjacentHTML( 'beforeend', `<style>body::before { content: ''; position: fixed; top: -10px; left: 0; width: 100%; height: 10px; box-shadow: 0px 0 8px rgba(0, 0, 0, 0.75); z-index: 999999999999999999999999999999999999999999999999999999999999999; }</style>`);");
  });
  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
    app.quit()
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function (e) {
  e.preventDefault();
  app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


const DiscordRPC = require('discord-rpc');

// don't change the client id if you want this example to work
const clientId = '640258963543425034';

// only needed for discord allowing spectate, join, ask to join
DiscordRPC.register(clientId);

const rpc = new DiscordRPC.Client({ transport: 'ipc' });



async function setActivity() {
  if (!rpc || !mainWindow) {
    return;
  }

  try {
    var timeout = await mainWindow.webContents.executeJavaScript('timeout');
    var isLoggedIn = await mainWindow.webContents.executeJavaScript('$("#sidebar").hasClass("logout");')

    if(isLoggedIn) {
      if(timeout <= 0) {
        rpc.setActivity({
          state: 'Ready To Place',
          largeImageKey: 'logo',
          largeImageText: 'r/region',
          instance: false,
        });
      } else {
        rpc.setActivity({
          state: 'Waiting',
          endTimestamp: (new Date()).getTime() + timeout,
          largeImageKey: 'logo',
          largeImageText: 'r/region',
          instance: false
        });
      }
    } else {
      rpc.setActivity({
        state: 'Not Logged In',
        largeImageKey: 'logo',
        largeImageText: 'r/region',
        instance: false,
      });
    }
  } catch(e) {

  }
}

rpc.on('ready', () => {
  setActivity();

  // activity can only be set every 15 seconds
  setInterval(() => {
    setActivity();
  }, 15000);
});