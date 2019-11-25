'use strict';
var packager = require('electron-packager');
var options = {
    'arch': 'ia32',
    'platform': 'win32',
    'dir': './',
    'app-copyright': 'Barnaby',
    'app-version': '1.0.0',
    'asar': true,
    'icon': './icon.ico',
    'name': 'region',
    'out': './release-builds',
    'overwrite': true,
    'prune': true,
    'version': '1.0.0',
    'version-string': {
        'CompanyName': 'BarnMS',
        'FileDescription': 'r/region', /*This is what display windows on task manager, shortcut and process*/
        'OriginalFilename': 'region',
        'ProductName': 'Stuff region',
        'InternalName': 'region'
    }
};
packager(options, function done_callback(err, appPaths) {
    console.log("Error: ", err);
    console.log("appPaths: ", appPaths);
});