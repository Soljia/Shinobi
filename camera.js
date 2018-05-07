//
// Shinobi
// Copyright (C) 2016 Moe Alam, moeiscool
//
//
// # Donate
//
// If you like what I am doing here and want me to continue please consider donating :)
// PayPal : paypal@m03.ca
//
var fs = require('fs');
process.on('uncaughtException', function(err) {
    console.error('Uncaught Exception occured!');
    console.error(err.stack);
});
var os = require('os');
var URL = require('url');
var path = require('path');
var mysql = require('mysql');
var moment = require('moment');
var request = require("request");
var CircularJSON = require('circular-json');
var ejs = require('ejs');
var io = new(require('socket.io'))();
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var socketIOclient = require('socket.io-client');
var crypto = require('crypto');
var webdav = require("webdav");
var jsonfile = require("jsonfile");
var connectionTester = require('connection-tester');
var events = require('events');
var Cam = require('onvif').Cam;
var Mp4Frag = require('mp4frag');
var P2P = require('pipe2pam');
var PamDiff = require('pam-diff');
var winston = require('winston');
var util = require('util');
var commandExists = require('command-exists').sync;

//Pro Modules
let LdapAuth = {};

// Configuration
let defaultConfig = require('./conf.default.json');
defaultConfig.location.defaultConfig = "conf.default.json"
defaultConfig.location.forEach((item) => item = __dirname + "/" + item)
defaultConfig.location.basedir = __dirname;

var importedConfig = fs.existsSync(defaultConfig.location.config) ? require(defaultConfig.location.config) : {};
let config = Object.assign({}, defaultConfig, importedConfig)

// Configuration - ffmpeg location
if (!config.location.ffmpegPath) {
    try {
        config.location.ffmpegPath = require('ffmpeg-static').path;
        if (!fs.existsSync(config.location.ffmpegPath)) {
            console.log('"ffmpeg-static" from NPM has failed to provide a compatible library or has been corrupted.')
            console.log('You may need to install FFmpeg manually or you can try running "npm uninstall ffmpeg-static && npm install ffmpeg-static".')
        }
    } catch (err) {
        config.location.ffmpegPath = false;
        console.log('No Static FFmpeg. Continuing.')
            //no static ffmpeg
    }
    if (!config.location.ffmpegPath) config.location.ffmpegPath = 'ffmpeg'
}
var logger = require("./js/log.js");
// Requirements check
let checkRequirements = () => {

    let error = (error) => {
            logger.log({ level: "error", message: "Requirement checks did not pass! See below." })
            logger.log({ level: "error", message: JSON.stringify(err) })
            process.exit(22);
        }
        // Check FFMpeg is available
    commandExists(config.location.ffmpegPath).then((command) => {
        if (require('ffmpeg-static').path !== config.location.ffmpegPath) {
            s.ffmpegVersion = execSync(command + " -version").toString().split('Copyright')[0].replace('ffmpeg version', '').trim()
            logger.log('FFMPEG version : ' + s.ffmpegVersion)
            if (s.ffmpegVersion.indexOf(': 2.') > -1) {
                throw 'FFMPEG is too old : ' + s.ffmpegVersion + ', Needed : 3.2+'
            }
        }
    }).catch(error)

    logger.log('NODE.JS version : ' + execSync("node -v"))
}
var sql = require("./js/sql.js");

try {
    var lang = require(config.location.languages + '/' + config.language + '.json');
} catch (er) {
    console.error(er)
    console.log('There was an error loading your language file.')
    var lang = require(config.location.languages + '/en_CA.json');
}
try {
    var definitions = require(config.location.definitions + '/' + config.language + '.json');
} catch (er) {
    console.error(er)
    console.log('There was an error loading your language file.')
    var definitions = require(config.location.definitions + '/en_CA.json');
}
process.send = process.send || function() {};
if (config.mail) {
    var nodemailer = require('nodemailer').createTransport(config.mail);
}
s = { factorAuth: {}, child_help: false, totalmem: os.totalmem(), platform: os.platform(), s: JSON.stringify, isWin: (process.platform === 'win32') };
s.__basedir = __dirname;

/*jsMap.set('misc', require('./js/misc')(requestModule)); // s: s, config: config, io: io }))
jsMap.set('logging', require('./js/logging')(requestModule)); //({ s, config, misc });
jsMap.set('sql', require('./js/sql')(requestModule)); //)({ config, logging, location })
jsMap.set('init', require('./js/init')(requestModule)); //)({ misc, sql, config });
init.config(config, () => { LdapAuth = require('ldapauth-fork'); });
logging.sqlCall = sql.query;
jsMap.set('ffmpeg', require('./js/ffmpeg')(requestModule)); //)(s, config, misc);
jsMap.set('camera', require('./js/camera')(requestModule)); //)({ s, config, ffmpeg, logging, lang, misc, nodemailer, sql, init });
jsMap.set('connection', require('./js/connection')(requestModule)); //)({ s, config, logging, misc, camera, lang, sql, init });
jsMap.set('screen', require('./js/screen')(requestModule)); //)({ s, config, misc, logging, sql, lang, location });
jsMap.set('pages', require('./js/pages')(requestModule)); //)({ s, config, logging, location, screen, io, lang, sql, camera, misc })
jsMap.set('stats', require('./js/stats')(requestModule)); //)({ s, logging, sql, camera, lang, misc, init, config });
jsMap.set('video', require('./js/video')(requestModule)); //)({ s, logging, sql, camera, misc, init });*/

//load languages dynamically
s.loadedLanguages = {}
s.loadedLanguages[config.language] = lang;
s.getLanguageFile = function(rule) {
        if (rule && rule !== '') {
            var file = s.loadedLanguages[file]
            if (!file) {
                try {
                    s.loadedLanguages[rule] = require(config.location.languages + '/' + rule + '.json')
                    file = s.loadedLanguages[rule]
                } catch (err) {
                    file = lang
                }
            }
        } else {
            file = lang
        }
        return file
    }
    //load defintions dynamically
s.loadedDefinitons = {}
s.loadedDefinitons[config.language] = definitions;
s.getDefinitonFile = function(rule) {
    if (rule && rule !== '') {
        var file = s.loadedDefinitons[file]
        if (!file) {
            try {
                s.loadedDefinitons[rule] = require(config.location.definitions + '/' + rule + '.json')
                file = s.loadedDefinitons[rule]
            } catch (err) {
                file = definitions
            }
        }
    } else {
        file = definitions
    }
    return file
}
process.on('exit', ffmpeg.kill.bind(null, { cleanup: true }));
process.on('SIGINT', ffmpeg.kill.bind(null, { exit: true }));
//key for child servers
s.child_nodes = {};
s.child_key = '3123asdasdf1dtj1hjk23sdfaasd12asdasddfdbtnkkfgvesra3asdsd3123afdsfqw345';

//directories
s.group = {};
if (!config.windowsTempDir && s.isWin === true) { config.windowsTempDir = 'C:/Windows/Temp' }
if (!config.defaultMjpeg) { config.defaultMjpeg = __dirname + '/web/libs/img/bg.jpg' }
//default stream folder check
if (!config.streamDir) {
    if (s.isWin === false) {
        config.streamDir = '/dev/shm'
    } else {
        config.streamDir = config.windowsTempDir
    }
    if (!fs.existsSync(config.streamDir)) {
        config.streamDir = __dirname + '/streams/'
    } else {
        config.streamDir += '/streams/'
    }
}
if (!config.videosDir) { config.videosDir = __dirname + '/videos/' }
if (!config.binDir) { config.binDir = __dirname + '/fileBin/' }
if (!config.addStorage) { config.addStorage = [] }
s.dir = {
    videos: misc.checkCorrectPathEnding(config.videosDir, __dirname),
    streams: misc.checkCorrectPathEnding(config.streamDir, __dirname),
    fileBin: misc.checkCorrectPathEnding(config.binDir, __dirname),
    addStorage: config.addStorage.map((dir) => { return { name: dir.name, path: misc.checkCorrectPathEnding(dir.path, __dirname) } }),
    languages: config.location.languages + '/'
};

let dirCheck = (dirs) => {
    let dirs_;
    if (!Array.isArray(dirs)) dirs_ = Object.keys(dirs).map((k) => dirs[k])
    else dirs_ = dirs;

    dirs_.forEach((dir) => {
        if (Array.isArray(dir)) dirCheck(dir)
        else if (dir !== null && typeof dir === 'object' && 'path' in dir) {
            if (!fs.existsSync(dir.path)) fs.mkdirSync(dir.path)
        } else if (!fs.existsSync(dir)) fs.mkdirSync(dir)
    })
}

dirCheck(s.dir);
////Camera Controller

s.filterEvents = function(x, d) {
    switch (x) {
        case 'archive':
            d.videos.forEach(function(v, n) {
                video.fn('archive', v)
            })
            break;
        case 'email':
            if (d.videos && d.videos.length > 0) {
                d.videos.forEach(function(v, n) {

                })
                d.mailOptions = {
                    from: '"ShinobiCCTV" <no-reply@shinobi.video>', // sender address
                    to: d.mail, // list of receivers
                    subject: lang['Filter Matches'] + ' : ' + d.name, // Subject line
                    html: lang.FilterMatchesText1 + ' ' + d.videos.length + ' ' + lang.FilterMatchesText2,
                };
                if (d.execute && d.execute !== '') {
                    d.mailOptions.html += '<div><b>' + lang.Executed + ' :</b> ' + d.execute + '</div>'
                }
                if (d.delete === '1') {
                    d.mailOptions.html += '<div><b>' + lang.Deleted + ' :</b> ' + lang.Yes + '</div>'
                }
                d.mailOptions.html += '<div><b>' + lang.Query + ' :</b> ' + d.query + '</div>'
                d.mailOptions.html += '<div><b>' + lang['Filter ID'] + ' :</b> ' + d.id + '</div>'
                nodemailer.sendMail(d.mailOptions, (error, info) => {
                    if (error) {
                        misc.tx({ f: 'error', ff: 'filter_mail', ke: d.ke, error: error }, 'GRP_' + d.ke);
                        return;
                    }
                    misc.tx({ f: 'filter_mail', ke: d.ke, info: info }, 'GRP_' + d.ke);
                });
            }
            break;
        case 'delete':
            d.videos.forEach(function(v, n) {
                VideoController.delete(v,{},(error, data) => {
                    Misc.tx({ f: 'video_delete', filename: filename, mid: video.mid, ke: video.ke, time: Misc.nameToTime(filename), end: Misc.moment(new Date, 'YYYY-MM-DD HH:mm:ss') }, 'GRP_' + video.ke);
                })

                //video.fn('delete', v)
            })
            break;
        case 'execute':
            exec(d.execute, { detached: true })
            break;
    }
}

//Plugins

////socket controller
s.cn = function(cn) { return { id: cn.id, ke: cn.ke, uid: cn.uid } }
io.on('connection', function(cn) { connection.init(cn) });
//Authenticator functions
s.api = {};
//auth handler
//params = parameters
//cb = callback
//res = response, only needed for express (http server)
//request = request, only needed for express (http server)
s.auth = function(params, cb, res, req) {
        if (req) {
            //express (http server) use of auth function
            params.ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            var failed = function() {
                if (!req.ret) { req.ret = { ok: false } }
                req.ret.msg = lang['Not Authorized'];
                res.end(s.s(req.ret, null, 3));
            }
        } else {
            //socket.io use of auth function
            var failed = function() {
                //maybe log
            }
        }
        var clearAfterTime = function() {
                //remove temp key from memory
                clearTimeout(s.api[params.auth].timeout)
                s.api[params.auth].timeout = setTimeout(function() {
                    delete(s.api[params.auth])
                }, 1000 * 60 * 5)
            }
            //check IP address of connecting user
        var finish = function(user) {
                if (s.api[params.auth].ip.indexOf('0.0.0.0') > -1 || s.api[params.auth].ip.indexOf(params.ip) > -1) {
                    cb(user);
                } else {
                    failed();
                }
            }
            //check if auth key is user's temporary session key
        if (s.group[params.ke] && s.group[params.ke].users && s.group[params.ke].users[params.auth]) {
            s.group[params.ke].users[params.auth].permissions = {};
            cb(s.group[params.ke].users[params.auth]);
        } else {
            //check if key is already in memory to save query time
            if (s.api[params.auth] && s.api[params.auth].details) {
                finish(s.api[params.auth]);
                if (s.api[params.auth].timeout) {
                    clearAfterTime()
                }
            } else {
                //no key in memory, query db to see if key exists
                //check if using username and password in plain text or md5
                if (params.username && params.username !== '' && params.password && params.password !== '') {
                    sql.select('*')
                        .from('Users')
                        .where('mail', params.username)
                        .where(() => { this.where('pass', params.password).orWhere('pass', misc.md5(params.password)) })
                        .asCallback(function(err, rows) {
                            if (rows && rows[0]) {
                                rows = rows[0];
                                rows.ip = '0.0.0.0';
                                rows.auth = misc.gid(20);
                                params.auth = rows.auth;
                                rows.details = JSON.parse(rows.details);
                                rows.permissions = {};
                                s.api[rows.auth] = rows;
                                clearAfterTime();
                                finish(rows);
                            } else {
                                failed();
                            }
                        })
                } else {
                    //not using plain login
                    sql.select('*')
                        .from('API')
                        .where({ code: params.auth, ke: params.ke })
                        .asCallback(function(err, rows) {
                            if (rows && rows[0]) {
                                rows = rows[0];
                                s.api[params.auth] = { ip: rows.ip, uid: rows.uid, ke: rows.ke, permissions: JSON.parse(rows.details), details: {} };
                                sql.select('details')
                                    .from('Users')
                                    .where({ uid: rows.uid, ke = rows.ke })
                                    .asCallback(function(err, rows2) {
                                        if (rows2 && rows2[0]) {
                                            rows2 = rows2[0];
                                            try {
                                                s.api[params.auth].mail = rows2.mail
                                                s.api[params.auth].details = JSON.parse(rows2.details)
                                                s.api[params.auth].lang = s.getLanguageFile(s.api[params.auth].details.lang)
                                            } catch (er) {}
                                        }
                                        finish(s.api[params.auth]);
                                    })
                            } else {
                                sql.select('*')
                                    .from('Users')
                                    .where({ auth: params.auth, ke: params.ke })
                                    .asCallback(function(err, rows) {
                                        if (rows && rows[0]) {
                                            rows = rows[0];
                                            rows.ip = '0.0.0.0'
                                            s.api[params.auth] = rows
                                            s.api[params.auth].details = JSON.parse(rows.details)
                                            s.api[params.auth].permissions = {}
                                            clearAfterTime()
                                            finish(rows)
                                        } else {
                                            failed();
                                        }
                                    })
                            }
                        })
                }
            }
        }
    }
    //super user authentication handler
s.superAuth = function(x, callback) {
        req = {};
        req.super = require(config.location.super);
        req.super.forEach(function(v, n) {
            if (x.md5 === true) {
                x.pass = misc.md5(x.pass);
            }
            if (x.mail.toLowerCase() === v.mail.toLowerCase() && x.pass === v.pass) {
                req.found = 1;
                if (x.users === true) {
                    sql.select('*')
                        .from('Users')
                        .whereNot('details', 'like', '%"sub"%')
                        .asCallback(function(err, rows) {
                            callback({ $user: v, users: rows, config: config, lang: lang })
                        })
                } else {
                    callback({ $user: v, config: config, lang: lang })
                }
            }
        })
        if (req.found !== 1) {
            return false;
        } else {
            return true;
        }
    }
    //login function
s.deleteFactorAuth = function(r) {
    delete(s.factorAuth[r.ke][r.uid])
    if (Object.keys(s.factorAuth[r.ke]).length === 0) {
        delete(s.factorAuth[r.ke])
    }
}

//Initialize Pages
pages.init();

//check disk space every 20 minutes
if (config.autoDropCache === true) {
    setInterval(function() {
        exec('echo 3 > /proc/sys/vm/drop_caches', { detached: true })
    }, 60000 * 20);
}
s.beat = function() {
    setTimeout(s.beat, 8000);
    io.sockets.emit('ping', { beat: 1 });
}
s.beat();
s.processReady = function() {
        logging.systemLog(lang.startUpText5)
        process.send('ready')
    }
    //Initialize disk monitoring
stats.initDiskMonitor();
stats.init_CPU_Memory_Monitor();