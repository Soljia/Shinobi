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
var ffmpegPath = false;
try {
    ffmpegPath = require('ffmpeg-static').path;
    if (!fs.existsSync(ffmpegPath)) {
        console.log('"ffmpeg-static" from NPM has failed to provide a compatible library or has been corrupted.')
        console.log('You may need to install FFmpeg manually or you can try running "npm uninstall ffmpeg-static && npm install ffmpeg-static".')
    }
} catch (err) {
    ffmpegPath = false;
    console.log('No Static FFmpeg. Continuing.')
        //no static ffmpeg
}
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
var location = {}
location.super = __dirname + '/super.json'
location.config = __dirname + '/conf.json'
location.config_default = __dirname + '/conf.default.json'
location.languages = __dirname + '/languages'
location.definitions = __dirname + '/definitions'
location.basedir = __dirname;
var importedConfig = require(location.config);
let defaultConfig = require(location.config_default);
let config = Object.assign({}, defaultConfig, importedConfig)


if (config.ip === undefined || config.ip === '' || config.ip.indexOf('0.0.0.0') > -1) { config.ip = 'localhost' } else { config.bindip = config.ip };

if (!config.productType) {
    config.productType = 'CE'
}
if (config.productType === 'Pro') {
    var LdapAuth = require('ldapauth-fork');
}
if (!config.language) {
    config.language = 'en_CA'
}
try {
    var lang = require(location.languages + '/' + config.language + '.json');
} catch (er) {
    console.error(er)
    console.log('There was an error loading your language file.')
    var lang = require(location.languages + '/en_CA.json');
}
try {
    var definitions = require(location.definitions + '/' + config.language + '.json');
} catch (er) {
    console.error(er)
    console.log('There was an error loading your language file.')
    var definitions = require(location.definitions + '/en_CA.json');
}
process.send = process.send || function() {};
if (config.mail) {
    var nodemailer = require('nodemailer').createTransport(config.mail);
}
s = { factorAuth: {}, child_help: false, totalmem: os.totalmem(), platform: os.platform(), s: JSON.stringify, isWin: (process.platform === 'win32') };
s.__basedir = __dirname;
var misc = require('./js/misc')({ s: s, config: config, io: io });
var logging = require('./js/logging')({ s, config, misc });
var sql = require('./js/sql')({ config, logging, location })
logging.sqlCall = sql.query;
var ffmpeg = require('./js/ffmpeg')(s, config, misc);
var camera = require('./js/camera')(s, config, ffmpeg, logging, lang, misc, nodemailer);
var connection = require('./js/connection')({ s, config, logging, misc, camera, lang, sql });
var screen = require('./js/screen')({ s, config, misc, logging, sql, lang, location });
var pages = require('./js/pages')({ s, config, logging, location, screen, io, lang, sql, camera, misc })
    //load languages dynamically
s.loadedLanguages = {}
s.loadedLanguages[config.language] = lang;
s.getLanguageFile = function(rule) {
        if (rule && rule !== '') {
            var file = s.loadedLanguages[file]
            if (!file) {
                try {
                    s.loadedLanguages[rule] = require(location.languages + '/' + rule + '.json')
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
                s.loadedDefinitons[rule] = require(location.definitions + '/' + rule + '.json')
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


console.log('NODE.JS version : ' + execSync("node -v"))
    //ffmpeg location
if (!config.ffmpegDir) {
    if (ffmpegPath !== false) {
        config.ffmpegDir = ffmpegPath
    } else {
        if (s.isWin === true) {
            config.ffmpegDir = __dirname + '/ffmpeg/ffmpeg.exe'
        } else {
            config.ffmpegDir = 'ffmpeg'
        }
    }
}
s.ffmpegVersion = execSync(config.ffmpegDir + " -version").toString().split('Copyright')[0].replace('ffmpeg version', '').trim()
console.log('FFMPEG version : ' + s.ffmpegVersion)
if (s.ffmpegVersion.indexOf(': 2.') > -1) {
    logging.systemLog('FFMPEG is too old : ' + s.ffmpegVersion + ', Needed : 3.2+', err)
    return
}
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
    addStorage: config.addStorage.map((dir) => { return {name: dir.name, path: misc.checkCorrectPathEnding(dir.path, __dirname)}}),
    languages: location.languages + '/'
};

let dirCheck = (dirs) => {
    let dirs_;
    if(!Array.isArray(dirs)) dirs_ = Object.keys(dirs).map((k) => dirs[k])
    else dirs_ = dirs;

    dirs_.forEach((dir) => {
        if (Array.isArray(dir)) dirCheck(dir)
        else if (dir.path && !fs.existsSync(dir.path)) fs.mkdirSync(dir.path)
        else if (!fs.existsSync(dir)) fs.mkdirSync(dir)
    })
}

dirCheck(s.dir);
    ////Camera Controller
s.init = function(x, e, k, fn) {
    if (!e) { e = {} }
    if (!k) { k = {} }
    switch (x) {
        case 0: //init camera
            if (!s.group[e.ke]) { s.group[e.ke] = {} };
            if (!s.group[e.ke].fileBin) { s.group[e.ke].fileBin = {} };
            if (!s.group[e.ke].mon) { s.group[e.ke].mon = {} }
            if (!s.group[e.ke].sizeChangeQueue) { s.group[e.ke].sizeChangeQueue = [] }
            if (!s.group[e.ke].sizePurgeQueue) { s.group[e.ke].sizePurgeQueue = [] }
            if (!s.group[e.ke].users) { s.group[e.ke].users = {} }
            if (!s.group[e.ke].mon[e.mid]) { s.group[e.ke].mon[e.mid] = {} }
            if (!s.group[e.ke].mon[e.mid].streamIn) { s.group[e.ke].mon[e.mid].streamIn = {} };
            if (!s.group[e.ke].mon[e.mid].emitterChannel) { s.group[e.ke].mon[e.mid].emitterChannel = {} };
            if (!s.group[e.ke].mon[e.mid].mp4frag) { s.group[e.ke].mon[e.mid].mp4frag = {} };
            if (!s.group[e.ke].mon[e.mid].firstStreamChunk) { s.group[e.ke].mon[e.mid].firstStreamChunk = {} };
            if (!s.group[e.ke].mon[e.mid].contentWriter) { s.group[e.ke].mon[e.mid].contentWriter = {} };
            if (!s.group[e.ke].mon[e.mid].eventBasedRecording) { s.group[e.ke].mon[e.mid].eventBasedRecording = {} };
            if (!s.group[e.ke].mon[e.mid].watch) { s.group[e.ke].mon[e.mid].watch = {} };
            if (!s.group[e.ke].mon[e.mid].fixingVideos) { s.group[e.ke].mon[e.mid].fixingVideos = {} };
            if (!s.group[e.ke].mon[e.mid].record) { s.group[e.ke].mon[e.mid].record = { yes: e.record } };
            if (!s.group[e.ke].mon[e.mid].started) { s.group[e.ke].mon[e.mid].started = 0 };
            if (s.group[e.ke].mon[e.mid].delete) { clearTimeout(s.group[e.ke].mon[e.mid].delete) }
            if (!s.group[e.ke].mon_conf) { s.group[e.ke].mon_conf = {} }
            s.init('apps', e)
            break;
        case 'group':
            if (!s.group[e.ke]) {
                s.group[e.ke] = {}
            }
            if (!s.group[e.ke].init) {
                s.group[e.ke].init = {}
            }
            if (!e.limit || e.limit === '') { e.limit = 10000 } else { e.limit = parseFloat(e.limit) }
            //save global space limit for group key (mb)
            s.group[e.ke].sizeLimit = e.limit;
            //save global used space as megabyte value
            s.group[e.ke].usedSpace = e.size / 1000000;
            //emit the changes to connected users
            s.init('diskUsedEmit', e)
            break;
        case 'apps':
            if (!s.group[e.ke].init) {
                s.group[e.ke].init = {};
            }
            if (!s.group[e.ke].webdav || !s.group[e.ke].sizeLimit) {
                sql.query('SELECT * FROM Users WHERE ke=? AND details NOT LIKE ?', [e.ke, '%"sub"%'], function(ar, r) {
                    if (r && r[0]) {
                        r = r[0];
                        ar = JSON.parse(r.details);
                        //owncloud/webdav
                        if (ar.webdav_user &&
                            ar.webdav_user !== '' &&
                            ar.webdav_pass &&
                            ar.webdav_pass !== '' &&
                            ar.webdav_url &&
                            ar.webdav_url !== ''
                        ) {
                            if (!ar.webdav_dir || ar.webdav_dir === '') {
                                ar.webdav_dir = '/';
                                if (ar.webdav_dir.slice(-1) !== '/') { ar.webdav_dir += '/'; }
                            }
                            s.group[e.ke].webdav = webdav(
                                ar.webdav_url,
                                ar.webdav_user,
                                ar.webdav_pass
                            );
                        }
                        Object.keys(ar).forEach(function(v) {
                            s.group[e.ke].init[v] = ar[v]
                        })
                    }
                });
            }
            break;
        case 'sync':
            e.cn = Object.keys(s.child_nodes);
            e.cn.forEach(function(v) {
                if (s.group[e.ke]) {
                    misc.cx({ f: 'sync', sync: s.init('noReference', s.group[e.ke].mon[e.mid]), ke: e.ke, mid: e.mid }, s.child_nodes[v].cnid);
                }
            });
            break;
        case 'noReference':
            x = { keys: Object.keys(e), ar: {} };
            x.keys.forEach(function(v) {
                if (v !== 'last_frame' && v !== 'record' && v !== 'spawn' && v !== 'running' && (v !== 'time' && typeof e[v] !== 'function')) { x.ar[v] = e[v]; }
            });
            return x.ar;
            break;
        case 'url':
            //build a complete url from pieces
            e.authd = '';
            if (e.details.muser && e.details.muser !== '' && e.host.indexOf('@') === -1) {
                e.authd = e.details.muser + ':' + e.details.mpass + '@';
            }
            if (e.port == 80 && e.details.port_force !== '1') { e.porty = '' } else { e.porty = ':' + e.port }
            e.url = e.protocol + '://' + e.authd + e.host + e.porty + e.path;
            return e.url;
            break;
        case 'url_no_path':
            e.authd = '';
            if (!e.details.muser) { e.details.muser = '' }
            if (!e.details.mpass) { e.details.mpass = '' }
            if (e.details.muser !== '' && e.host.indexOf('@') === -1) {
                e.authd = e.details.muser + ':' + e.details.mpass + '@';
            }
            if (e.port == 80 && e.details.port_force !== '1') { e.porty = '' } else { e.porty = ':' + e.port }
            e.url = e.protocol + '://' + e.authd + e.host + e.porty;
            return e.url;
            break;
        case 'diskUsedEmit':
            //send the amount used disk space to connected users
            if (s.group[e.ke] && s.group[e.ke].init) {
                misc.tx({ f: 'diskUsed', size: s.group[e.ke].usedSpace, limit: s.group[e.ke].sizeLimit }, 'GRP_' + e.ke);
            }
            break;
        case 'diskUsedSet':
            //`k` will be used as the value to add or substract
            s.group[e.ke].sizeChangeQueue.push(k)
            if (s.group[e.ke].sizeChanging !== true) {
                //lock this function
                s.group[e.ke].sizeChanging = true
                    //validate current values
                if (!s.group[e.ke].usedSpace) {
                    s.group[e.ke].usedSpace = 0
                } else {
                    s.group[e.ke].usedSpace = parseFloat(s.group[e.ke].usedSpace)
                }
                if (s.group[e.ke].usedSpace < 0 || isNaN(s.group[e.ke].usedSpace)) {
                    s.group[e.ke].usedSpace = 0
                }
                //set queue processor
                var checkQueue = function() {
                    //get first in queue
                    var currentChange = s.group[e.ke].sizeChangeQueue[0]
                        //change global size value
                    s.group[e.ke].usedSpace = s.group[e.ke].usedSpace + currentChange
                        //remove value just used from queue
                    s.group[e.ke].sizeChangeQueue = s.group[e.ke].sizeChangeQueue.splice(1, s.group[e.ke].sizeChangeQueue.length + 10)
                        //do next one
                    if (s.group[e.ke].sizeChangeQueue.length > 0) {
                        checkQueue()
                    } else {
                        s.group[e.ke].sizeChanging = false
                        s.init('diskUsedEmit', e)
                    }
                }
                checkQueue()
            }
            break;
    }
    if (typeof e.callback === 'function') { setTimeout(function() { e.callback() }, 500); }
}
s.filterEvents = function(x, d) {
    switch (x) {
        case 'archive':
            d.videos.forEach(function(v, n) {
                s.video('archive', v)
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
                s.video('delete', v)
            })
            break;
        case 'execute':
            exec(d.execute, { detached: true })
            break;
    }
}
s.video = function(x, e, k) {
    if (!e) { e = {} };
    switch (x) {
        case 'getDir':
            if (e.mid && !e.id) { e.id = e.mid };
            if (e.details && (e.details instanceof Object) === false) {
                try { e.details = JSON.parse(e.details) } catch (err) {}
            }
            if (e.details && e.details.dir && e.details.dir !== '') {
                return misc.checkCorrectPathEnding(e.details.dir) + e.ke + '/' + e.id + '/'
            } else {
                return s.dir.videos + e.ke + '/' + e.id + '/';
            }
            break;
    }
    if (!k) k = {};
    if (x !== 'getDir') { e.dir = s.video('getDir', e) }
    switch (x) {
        case 'fix':
            e.sdir = s.dir.streams + e.ke + '/' + e.id + '/';
            if (!e.filename && e.time) { e.filename = misc.moment(e.time) }
            if (e.filename.indexOf('.') === -1) {
                e.filename = e.filename + '.' + e.ext
            }
            misc.tx({ f: 'video_fix_start', mid: e.mid, ke: e.ke, filename: e.filename }, 'GRP_' + e.ke)
            s.group[e.ke].mon[e.id].fixingVideos[e.filename] = {}
            switch (e.ext) {
                case 'mp4':
                    e.fixFlags = '-vcodec libx264 -acodec aac -strict -2';
                    break;
                case 'webm':
                    e.fixFlags = '-vcodec libvpx -acodec libvorbis';
                    break;
            }
            e.spawn = spawn(config.ffmpegDir, ('-i ' + e.dir + e.filename + ' ' + e.fixFlags + ' ' + e.sdir + e.filename).split(' '), { detached: true })
            e.spawn.stdout.on('data', function(data) {
                misc.tx({ f: 'video_fix_data', mid: e.mid, ke: e.ke, filename: e.filename }, 'GRP_' + e.ke)
            });
            e.spawn.on('close', function(data) {
                exec('mv ' + e.dir + e.filename + ' ' + e.sdir + e.filename, { detached: true }).on('exit', function() {
                    misc.tx({ f: 'video_fix_success', mid: e.mid, ke: e.ke, filename: e.filename }, 'GRP_' + e.ke)
                    delete(s.group[e.ke].mon[e.id].fixingVideos[e.filename]);
                })
            });
            break;
        case 'archive':
            if (!e.filename && e.time) { e.filename = misc.moment(e.time) }
            if (!e.status) { e.status = 0 }
            e.details.archived = "1"
            e.save = [JSON.stringify(e.details), e.id, e.ke, misc.nameToTime(e.filename)];
            sql.query('UPDATE Videos SET details=? WHERE `mid`=? AND `ke`=? AND `time`=?', e.save, function(err, r) {
                misc.tx({ f: 'video_edit', status: 3, filename: e.filename + '.' + e.ext, mid: e.mid, ke: e.ke, time: misc.nameToTime(e.filename) }, 'GRP_' + e.ke);
            });
            break;
        case 'delete':
            if (!e.filename && e.time) { e.filename = misc.moment(e.time) }
            var filename
            if (e.filename.indexOf('.') > -1) {
                filename = e.filename
            } else {
                filename = e.filename + '.' + e.ext
            }
            if (!e.status) { e.status = 0 }
            e.save = [e.id, e.ke, misc.nameToTime(filename)];
            sql.query('SELECT * FROM Videos WHERE `mid`=? AND `ke`=? AND `time`=?', e.save, function(err, r) {
                if (r && r[0]) {
                    r = r[0]
                    var dir = s.video('getDir', r)
                    sql.query('DELETE FROM Videos WHERE `mid`=? AND `ke`=? AND `time`=?', e.save, function() {
                        fs.stat(dir + filename, function(err, file) {
                            if (err) {
                                logging.systemLog('File Delete Error : ' + e.ke + ' : ' + ' : ' + e.mid, err)
                            }
                            s.init('diskUsedSet', e, -(r.size / 1000000))
                        })
                        misc.tx({ f: 'video_delete', filename: filename, mid: e.mid, ke: e.ke, time: misc.nameToTime(filename), end: misc.moment(new Date, 'YYYY-MM-DD HH:mm:ss') }, 'GRP_' + e.ke);
                        s.file('delete', dir + filename)
                    })
                }
            })
            break;
        case 'open':
            //on video open
            e.save = [e.id, e.ke, misc.nameToTime(e.filename), e.ext];
            if (!e.status) { e.save.push(0) } else { e.save.push(e.status) }
            k.details = {}
            if (e.details && e.details.dir && e.details.dir !== '') {
                k.details.dir = e.details.dir
            }
            e.save.push(s.s(k.details))
            sql.query('INSERT INTO Videos (mid,ke,time,ext,status,details) VALUES (?,?,?,?,?,?)', e.save)
            misc.tx({ f: 'video_build_start', filename: e.filename + '.' + e.ext, mid: e.id, ke: e.ke, time: misc.nameToTime(e.filename), end: misc.moment(new Date, 'YYYY-MM-DD HH:mm:ss') }, 'GRP_' + e.ke);
            break;
        case 'diskUseUpdate':
            if (s.group[e.ke].init) {
                s.init('diskUsedSet', e, e.filesizeMB)
                if (config.cron.deleteOverMax === true) {
                    //check space
                    s.group[e.ke].sizePurgeQueue.push(1)
                    if (s.group[e.ke].sizePurging !== true) {
                        //lock this function
                        s.group[e.ke].sizePurging = true
                            //set queue processor
                        var finish = function() {
                            //                                        console.log('checkQueueOne',s.group[e.ke].sizePurgeQueue.length)
                            //remove value just used from queue
                            s.group[e.ke].sizePurgeQueue = s.group[e.ke].sizePurgeQueue.splice(1, s.group[e.ke].sizePurgeQueue.length + 10)
                                //do next one
                            if (s.group[e.ke].sizePurgeQueue.length > 0) {
                                checkQueue()
                            } else {
                                //                                            console.log('checkQueueFinished',s.group[e.ke].sizePurgeQueue.length)
                                s.group[e.ke].sizePurging = false
                                s.init('diskUsedEmit', e)
                            }
                        }
                        var checkQueue = function() {
                            //                                        console.log('checkQueue',config.cron.deleteOverMaxOffset)
                            //get first in queue
                            var currentPurge = s.group[e.ke].sizePurgeQueue[0]
                            var deleteVideos = function() {
                                //                                            console.log(s.group[e.ke].usedSpace>(s.group[e.ke].sizeLimit*config.cron.deleteOverMaxOffset))
                                //run purge command
                                if (s.group[e.ke].usedSpace > (s.group[e.ke].sizeLimit * config.cron.deleteOverMaxOffset)) {
                                    sql.query('SELECT * FROM Videos WHERE status != 0 AND details NOT LIKE \'%"archived":"1"%\' AND ke=? ORDER BY `time` ASC LIMIT 2', [e.ke], function(err, evs) {
                                        k.del = [];
                                        k.ar = [e.ke];
                                        evs.forEach(function(ev) {
                                            ev.dir = s.video('getDir', ev) + s.moment(ev.time) + '.' + ev.ext;
                                            k.del.push('(mid=? AND time=?)');
                                            k.ar.push(ev.mid), k.ar.push(ev.time);
                                            s.file('delete', ev.dir);
                                            s.init('diskUsedSet', e, -(ev.size / 1000000))
                                            s.tx({ f: 'video_delete', ff: 'over_max', filename: s.moment(ev.time) + '.' + ev.ext, mid: ev.mid, ke: ev.ke, time: ev.time, end: s.moment(new Date, 'YYYY-MM-DD HH:mm:ss') }, 'GRP_' + e.ke);
                                        });
                                        if (k.del.length > 0) {
                                            k.qu = k.del.join(' OR ');
                                            sql.query('DELETE FROM Videos WHERE ke =? AND (' + k.qu + ')', k.ar, function() {
                                                deleteVideos()
                                            })
                                        } else {
                                            finish()
                                        }
                                    })
                                } else {
                                    finish()
                                }
                            }
                            deleteVideos()
                        }
                        checkQueue()
                    }
                } else {
                    s.init('diskUsedEmit', e)
                }
            }
            break;
        case 'close':
            //video function : close
            if (s.group[e.ke] && s.group[e.ke].mon[e.id]) {
                if (s.group[e.ke].mon[e.id].open && !e.filename) {
                    e.filename = s.group[e.ke].mon[e.id].open;
                    e.ext = s.group[e.ke].mon[e.id].open_ext
                }
                if (s.group[e.ke].mon[e.id].child_node) {
                    misc.cx({ f: 'close', d: s.init('noReference', e) }, s.group[e.ke].mon[e.id].child_node_id);
                } else {
                    k.file = e.filename + '.' + e.ext
                    k.dir = e.dir.toString()
                        //get file directory
                    k.fileExists = fs.existsSync(k.dir + k.file)
                    if (k.fileExists !== true) {
                        k.dir = s.dir.videos + '/' + e.ke + '/' + e.id + '/'
                        k.fileExists = fs.existsSync(k.dir + k.file)
                        if (k.fileExists !== true) {
                            s.dir.addStorage.forEach(function(v) {
                                if (k.fileExists !== true) {
                                    k.dir = misc.checkCorrectPathEnding(v.path) + e.ke + '/' + e.id + '/'
                                    k.fileExists = fs.existsSync(k.dir + k.file)
                                }
                            })
                        }
                    }
                    if (k.fileExists === true) {
                        //close video row
                        k.stat = fs.statSync(k.dir + k.file)
                        e.filesize = k.stat.size
                        e.filesizeMB = parseFloat((e.filesize / 1000000).toFixed(2))
                        e.end_time = s.moment(k.stat.mtime, 'YYYY-MM-DD HH:mm:ss')
                        var save = [
                            e.filesize,
                            1,
                            e.end_time,
                            e.id,
                            e.ke,
                            s.nameToTime(e.filename)
                        ]
                        if (!e.status) {
                            save.push(0)
                        } else {
                            save.push(e.status)
                        }
                        sql.query('UPDATE Videos SET `size`=?,`status`=?,`end`=? WHERE `mid`=? AND `ke`=? AND `time`=? AND `status`=?', save)
                            //send event for completed recording
                        s.txWithSubPermissions({
                            f: 'video_build_success',
                            hrefNoAuth: '/videos/' + e.ke + '/' + e.mid + '/' + k.file,
                            filename: k.file,
                            mid: e.id,
                            ke: e.ke,
                            time: moment(s.nameToTime(e.filename)).format(),
                            size: e.filesize,
                            end: moment(e.end_time).format()
                        }, 'GRP_' + e.ke, 'video_view');
                        //send new diskUsage values
                        s.video('diskUseUpdate', e, k)
                    } else {
                        s.video('delete', e);
                        s.log(e, { type: lang['File Not Exist'], msg: lang.FileNotExistText, ffmpeg: s.group[e.ke].mon[e.id].ffmpeg })
                        if (e.mode && config.restart.onVideoNotExist === true && e.fn) {
                            delete(s.group[e.ke].mon[e.id].open);
                            s.log(e, { type: lang['Camera is not recording'], msg: { msg: lang.CameraNotRecordingText } });
                            if (s.group[e.ke].mon[e.id].started === 1) {
                                s.camera('restart', e)
                            }
                        }
                    }
                }
            }
            delete(s.group[e.ke].mon[e.id].open);
            break;
        case 'insertCompleted':
            k.dir = e.dir.toString()
                //get file directory
            k.fileExists = fs.existsSync(k.dir + k.file)
            if (k.fileExists !== true) {
                k.dir = s.dir.videos + '/' + e.ke + '/' + e.id + '/'
                k.fileExists = fs.existsSync(k.dir + k.file)
                if (k.fileExists !== true) {
                    s.dir.addStorage.forEach(function(v) {
                        if (k.fileExists !== true) {
                            k.dir = s.checkCorrectPathEnding(v.path) + e.ke + '/' + e.id + '/'
                            k.fileExists = fs.existsSync(k.dir + k.file)
                        }
                    })
                }
            }
            if (k.fileExists === true) {
                //close video row
                k.stat = fs.statSync(k.dir + k.file)
                e.filesize = k.stat.size
                e.filesizeMB = parseFloat((e.filesize / 1000000).toFixed(2))
                e.startTime = s.nameToTime(k.file)
                e.endTime = s.moment(k.stat.mtime, 'YYYY-MM-DD HH:mm:ss')
                if (!e.ext) { e.ext = k.file.split('.')[1] }
                //send event for completed recording
                s.txWithSubPermissions({
                    f: 'video_build_success',
                    hrefNoAuth: '/videos/' + e.ke + '/' + e.mid + '/' + k.file,
                    filename: k.file,
                    mid: e.mid,
                    ke: e.ke,
                    time: moment(e.startTime).format(),
                    size: e.filesize,
                    end: moment(e.endTime).format()
                }, 'GRP_' + e.ke, 'video_view');

                //cloud auto savers
                //webdav
                //                var webDAV = s.group[e.ke].webdav
                //                if(webDAV&&s.group[e.ke].init.use_webdav!=='0'&&s.group[e.ke].init.webdav_save=="1"){
                //                   fs.readFile(k.dir+k.file,function(err,data){
                //                       var webdavUploadDir = s.group[e.ke].init.webdav_dir+e.ke+'/'+e.mid+'/'
                //                       fs.readFile(k.dir+k.file,function(err,data){
                //                           webDAV.putFileContents(webdavUploadDir+k.file,"binary",data).catch(function(err) {
                //                               if(err){
                //                                   webDAV.createDirectory(webdavUploadDir).catch(function(err) {
                //                                       s.log(e,{type:lang['Webdav Error'],msg:{msg:lang.WebdavErrorText+' <b>/'+webdavUploadDir+'</b>',info:err}})
                //                                   })
                //                                   webDAV.putFileContents(webdavUploadDir+k.file,"binary",data).catch(function(err) {
                //                                       s.log(e,{type:lang['Webdav Error'],msg:{msg:lang.WebdavErrorText+' <b>/'+webdavUploadDir+'</b>',info:err}})
                //                                   })
                //                                   s.log(e,{type:lang['Webdav Error'],msg:{msg:lang.WebdavErrorText+' <b>/'+webdavUploadDir+'</b>',info:err}})
                //                               }
                //                           });
                //                        });
                //                    });
                //                }
                if (s.group[e.ke].webdav && s.group[e.ke].init.use_webdav !== '0' && s.group[e.ke].init.webdav_save == "1") {
                    fs.readFile(k.dir + k.file, function(err, data) {
                        s.group[e.ke].webdav.putFileContents(s.group[e.ke].init.webdav_dir + e.ke + '/' + e.mid + '/' + k.file, "binary", data)
                            .catch(function(err) {
                                s.log(e, { type: lang['Webdav Error'], msg: { msg: lang.WebdavErrorText + ' <b>/' + e.ke + '/' + e.id + '</b>', info: err }, ffmpeg: s.group[e.ke].mon[e.id].ffmpeg })
                                console.error(err);
                            });
                    });
                }
                k.details = {}
                if (e.details && e.details.dir && e.details.dir !== '') {
                    k.details.dir = e.details.dir
                }
                var save = [
                    e.mid,
                    e.ke,
                    e.startTime,
                    e.ext,
                    1,
                    s.s(k.details),
                    e.filesize,
                    e.endTime,
                ]
                sql.query('INSERT INTO Videos (mid,ke,time,ext,status,details,size,end) VALUES (?,?,?,?,?,?,?,?)', save)
                    //send new diskUsage values
                s.video('diskUseUpdate', e, k)
            } else {
                console.log(k)
            }
            break;
    }
}
s.splitForFFPMEG = function(ffmpegCommandAsString) {
    //this function ignores spaces inside quotes.
    return ffmpegCommandAsString.match(/\\?.|^$/g).reduce((p, c) => {
        if (c === '"') {
            p.quote ^= 1;
        } else if (!p.quote && c === ' ') {
            p.a.push('');
        } else {
            p.a[p.a.length - 1] += c.replace(/\\(.)/, "$1");
        }
        return p;
    }, { a: [''] }).a
};
s.ffmpeg = function(e) {
    //create input map
    var createFFmpegMap = function(arrayOfMaps) {
        //e.details.input_map_choices.stream
        var string = '';
        if (arrayOfMaps && arrayOfMaps instanceof Array && arrayOfMaps.length > 0) {
            arrayOfMaps.forEach(function(v) {
                if (v.map === '') v.map = '0'
                string += ' -map ' + v.map
            })
        } else {
            string += ' -map 0'
        }
        return string;
    }
    var createInputMap = function(number, input) {
            //fulladdress - Full Input Path
            //`x` is an object used to contain temporary values.
            var x = {}
            x.cust_input = ''
            x.hwaccel = ''
            if (input.cust_input && input.cust_input !== '') { x.cust_input += ' ' + input.cust_input; }
            //input - analyze duration
            if (input.aduration && input.aduration !== '') { x.cust_input += ' -analyzeduration ' + input.aduration };
            //input - probe size
            if (input.probesize && input.probesize !== '') { x.cust_input += ' -probesize ' + input.probesize };
            //input - stream loop (good for static files/lists)
            if (input.stream_loop === '1') { x.cust_input += ' -stream_loop -1' };
            //input - is h264 has rtsp in address and transport method is chosen
            if (input.type === 'mjpeg') {
                if (x.cust_input.indexOf('-f ') === -1) {
                    x.cust_input += ' -f mjpeg'
                }
                //input - frames per second
                if (x.cust_input.indexOf('-r ') === -1 && !input.sfps || input.sfps === '') {
                    input.sfps = parseFloat(input.sfps);
                    if (isNaN(input.sfps)) { input.sfps = 1 }
                    input.sfps
                    x.cust_input += ' -r ' + input.sfps
                }
                x.cust_input += ' -reconnect 1';
            }
            if ((input.type === 'h264' || input.type === 'mp4') && input.fulladdress.indexOf('rtsp://') > -1 && input.rtsp_transport !== '' && input.rtsp_transport !== 'no') {
                x.cust_input += ' -rtsp_transport ' + input.rtsp_transport;
            }
            if ((input.type === 'mp4' || input.type === 'mjpeg') && x.cust_input.indexOf('-re') === -1) {
                x.cust_input += ' -re'
            }
            //hardware acceleration
            if (input.accelerator && input.accelerator === '1') {
                if (input.hwaccel && input.hwaccel !== '') {
                    x.hwaccel += ' -hwaccel ' + input.hwaccel;
                }
                if (input.hwaccel_vcodec && input.hwaccel_vcodec !== '' && input.hwaccel_vcodec !== 'auto' && input.hwaccel_vcodec !== 'no') {
                    x.hwaccel += ' -c:v ' + input.hwaccel_vcodec;
                }
                if (input.hwaccel_device && input.hwaccel_device !== '') {
                    switch (input.hwaccel) {
                        case 'vaapi':
                            x.hwaccel += ' -vaapi_device ' + input.hwaccel_device + ' -hwaccel_output_format vaapi';
                            break;
                        default:
                            x.hwaccel += ' -hwaccel_device ' + input.hwaccel_device;
                            break;
                    }
                }
            }
            //custom - input flags
            return x.hwaccel + x.cust_input + ' -i "' + input.fulladdress + '"';
        }
        //create sub stream channel
    var createStreamChannel = function(number, channel) {
            //`x` is an object used to contain temporary values.
            var x = {
                pipe: ''
            }
            if (!number || number == '') {
                x.channel_sdir = e.sdir;
            } else {
                x.channel_sdir = e.sdir + 'channel' + number + '/';
                if (!fs.existsSync(x.channel_sdir)) {
                    fs.mkdirSync(x.channel_sdir);
                }
            }
            x.stream_video_filters = []
                //stream - frames per second
            if (channel.stream_vcodec !== 'copy') {
                if (!channel.stream_fps || channel.stream_fps === '') {
                    switch (channel.stream_type) {
                        case 'rtmp':
                            channel.stream_fps = 30
                            break;
                        default:
                            //                        channel.stream_fps=5
                            break;
                    }
                }
            }
            if (channel.stream_fps && channel.stream_fps !== '') { x.stream_fps = ' -r ' + channel.stream_fps } else { x.stream_fps = '' }

            //stream - hls vcodec
            if (channel.stream_vcodec && channel.stream_vcodec !== 'no') {
                if (channel.stream_vcodec !== '') { x.stream_vcodec = ' -c:v ' + channel.stream_vcodec } else { x.stream_vcodec = ' -c:v libx264' }
            } else {
                x.stream_vcodec = '';
            }
            //stream - hls acodec
            if (channel.stream_acodec !== 'no') {
                if (channel.stream_acodec && channel.stream_acodec !== '') { x.stream_acodec = ' -c:a ' + channel.stream_acodec } else { x.stream_acodec = '' }
            } else {
                x.stream_acodec = ' -an';
            }
            //stream - resolution
            if (channel.stream_scale_x && channel.stream_scale_x !== '' && channel.stream_scale_y && channel.stream_scale_y !== '') {
                x.ratio = channel.stream_scale_x + 'x' + channel.stream_scale_y;
            }
            //stream - hls segment time
            if (channel.hls_time && channel.hls_time !== '') { x.hls_time = channel.hls_time } else { x.hls_time = "2" }
            //hls list size
            if (channel.hls_list_size && channel.hls_list_size !== '') { x.hls_list_size = channel.hls_list_size } else { x.hls_list_size = 2 }
            //stream - custom flags
            if (channel.cust_stream && channel.cust_stream !== '') { x.cust_stream = ' ' + channel.cust_stream } else { x.cust_stream = '' }
            //stream - preset
            if (channel.preset_stream && channel.preset_stream !== '') { x.preset_stream = ' -preset ' + channel.preset_stream; } else { x.preset_stream = '' }
            //hardware acceleration
            if (e.details.accelerator && e.details.accelerator === '1') {
                if (e.details.hwaccel && e.details.hwaccel !== '') {
                    x.hwaccel += ' -hwaccel ' + e.details.hwaccel;
                }
                if (e.details.hwaccel_vcodec && e.details.hwaccel_vcodec !== '') {
                    x.hwaccel += ' -c:v ' + e.details.hwaccel_vcodec;
                }
                if (e.details.hwaccel_device && e.details.hwaccel_device !== '') {
                    switch (e.details.hwaccel) {
                        case 'vaapi':
                            x.hwaccel += ' -vaapi_device ' + e.details.hwaccel_device + ' -hwaccel_output_format vaapi';
                            break;
                        default:
                            x.hwaccel += ' -hwaccel_device ' + e.details.hwaccel_device;
                            break;
                    }
                }
                //        else{
                //            if(e.details.hwaccel==='vaapi'){
                //                x.hwaccel+=' -hwaccel_device 0';
                //            }
                //        }
            }

            if (channel.rotate_stream && channel.rotate_stream !== "" && channel.rotate_stream !== "no") {
                x.stream_video_filters.push('transpose=' + channel.rotate_stream);
            }
            //stream - video filter
            if (channel.svf && channel.svf !== '') {
                x.stream_video_filters.push(channel.svf)
            }
            if (x.stream_video_filters.length > 0) {
                var string = x.stream_video_filters.join(',').trim()
                if (string === '') {
                    x.stream_video_filters = ''
                } else {
                    x.stream_video_filters = ' -vf ' + string
                }
            } else {
                x.stream_video_filters = ''
            }
            if (e.details.input_map_choices && e.details.input_map_choices.record) {
                //add input feed map
                x.pipe += createFFmpegMap(e.details.input_map_choices['stream_channel-' + (number - config.pipeAddition)])
            }
            if (channel.stream_vcodec !== 'copy') {
                x.cust_stream += x.stream_fps
            }
            switch (channel.stream_type) {
                case 'mp4':
                    x.cust_stream += ' -movflags +frag_keyframe+empty_moov+default_base_moof -metadata title="Poseidon Stream" -reset_timestamps 1'
                    if (channel.stream_vcodec !== 'copy') {
                        if (x.cust_stream.indexOf('-s ') === -1) { x.cust_stream += ' -s ' + x.ratio }
                        if (channel.stream_quality && channel.stream_quality !== '') x.cust_stream += ' -crf ' + channel.stream_quality;
                        x.cust_stream += x.preset_stream
                        x.cust_stream += x.stream_video_filters
                    }
                    x.pipe += ' -f mp4' + x.stream_acodec + x.stream_vcodec + x.cust_stream + ' pipe:' + number;
                    break;
                case 'rtmp':
                    x.rtmp_server_url = s.checkCorrectPathEnding(channel.rtmp_server_url);
                    if (channel.stream_vcodec !== 'copy') {
                        if (channel.stream_vcodec === 'libx264') {
                            channel.stream_vcodec = 'h264'
                        }
                        if (channel.stream_quality && channel.stream_quality !== '') x.cust_stream += ' -crf ' + channel.stream_quality;
                        x.cust_stream += x.preset_stream
                        if (channel.stream_v_br && channel.stream_v_br !== '') { x.cust_stream += ' -b:v ' + channel.stream_v_br }
                    }
                    if (channel.stream_vcodec !== 'no' && channel.stream_vcodec !== '') {
                        x.cust_stream += ' -vcodec ' + channel.stream_vcodec
                    }
                    if (channel.stream_acodec !== 'copy') {
                        if (!channel.stream_acodec || channel.stream_acodec === '' || channel.stream_acodec === 'no') {
                            channel.stream_acodec = 'aac'
                        }
                        if (!channel.stream_a_br || channel.stream_a_br === '') { channel.stream_a_br = '128k' }
                        x.cust_stream += ' -ab ' + channel.stream_a_br
                    }
                    if (channel.stream_acodec !== '') {
                        x.cust_stream += ' -acodec ' + channel.stream_acodec
                    }
                    x.pipe += ' -f flv' + x.stream_video_filters + x.cust_stream + ' "' + x.rtmp_server_url + channel.rtmp_stream_key + '"';
                    break;
                case 'h264':
                    if (channel.stream_vcodec !== 'copy') {
                        if (x.cust_stream.indexOf('-s ') === -1 && x.ratio) { x.cust_stream += ' -s ' + x.ratio }
                        if (channel.stream_quality && channel.stream_quality !== '') x.cust_stream += ' -crf ' + channel.stream_quality;
                        x.cust_stream += x.preset_stream
                        x.cust_stream += x.stream_video_filters
                    }
                    x.pipe += ' -f mpegts' + x.stream_acodec + x.stream_vcodec + x.cust_stream + ' pipe:' + number;
                    break;
                case 'flv':
                    if (channel.stream_vcodec !== 'copy') {
                        if (x.cust_stream.indexOf('-s ') === -1 && x.ratio) { x.cust_stream += ' -s ' + x.ratio }
                        if (channel.stream_quality && channel.stream_quality !== '') x.cust_stream += ' -crf ' + channel.stream_quality;
                        x.cust_stream += x.preset_stream
                        x.cust_stream += x.stream_video_filters
                    }
                    x.pipe += ' -f flv' + x.stream_acodec + x.stream_vcodec + x.cust_stream + ' pipe:' + number;
                    break;
                case 'hls':
                    if (channel.stream_vcodec !== 'h264_vaapi' && channel.stream_vcodec !== 'copy') {
                        if (channel.stream_quality && channel.stream_quality !== '') x.cust_stream += ' -crf ' + channel.stream_quality;
                        if (x.cust_stream.indexOf('-tune') === -1) { x.cust_stream += ' -tune zerolatency' }
                        if (x.cust_stream.indexOf('-g ') === -1) { x.cust_stream += ' -g 1' }
                        if (x.cust_stream.indexOf('-s ') === -1 && x.ratio) { x.cust_stream += ' -s ' + x.ratio }
                        x.cust_stream += x.stream_video_filters
                    }
                    x.pipe += x.preset_stream + x.stream_acodec + x.stream_vcodec + ' -f hls' + x.cust_stream + ' -hls_time ' + x.hls_time + ' -hls_list_size ' + x.hls_list_size + ' -start_number 0 -hls_allow_cache 0 -hls_flags +delete_segments+omit_endlist "' + x.channel_sdir + 's.m3u8"';
                    break;
                case 'mjpeg':
                    if (channel.stream_quality && channel.stream_quality !== '') x.cust_stream += ' -q:v ' + channel.stream_quality;
                    x.pipe += ' -c:v mjpeg -f mpjpeg -boundary_tag shinobi' + x.cust_stream + x.stream_video_filters + ' -s ' + x.ratio + ' pipe:' + number;
                    break;
                default:
                    x.pipe = ''
                    break;
            }
            return x.pipe
        }
        //set X for temporary values so we don't break our main monitor object.
    var x = { tmp: '' };
    //set some placeholding values to avoid "undefined" in ffmpeg string.
    x.record_string = ''
    x.cust_input = ''
    x.cust_detect = ' '
    x.record_video_filters = []
    x.stream_video_filters = []
    x.hwaccel = ''
    x.pipe = ''
        //input - frame rate (capture rate)
    if (e.details.sfps && e.details.sfps !== '') { x.input_fps = ' -r ' + e.details.sfps } else { x.input_fps = '' }
    //input - analyze duration
    if (e.details.aduration && e.details.aduration !== '') { x.cust_input += ' -analyzeduration ' + e.details.aduration };
    //input - probe size
    if (e.details.probesize && e.details.probesize !== '') { x.cust_input += ' -probesize ' + e.details.probesize };
    //input - stream loop (good for static files/lists)
    if (e.details.stream_loop === '1') { x.cust_input += ' -stream_loop -1' };
    //input
    switch (e.type) {
        case 'h264':
            switch (e.protocol) {
                case 'rtsp':
                    if (e.details.cust_input.indexOf('-fflags') === -1) { x.cust_input += ' -fflags +igndts' }
                    if (e.details.rtsp_transport && e.details.rtsp_transport !== '' && e.details.rtsp_transport !== 'no') { x.cust_input += ' -rtsp_transport ' + e.details.rtsp_transport; }
                    break;
            }
            break;
    }
    //record - resolution
    switch (s.ratio(e.width, e.height)) {
        case '16:9':
            x.ratio = '640x360';
            break;
        default:
            x.ratio = '640x480';
            break;
    }
    if (e.width !== '' && e.height !== '' && !isNaN(e.width) && !isNaN(e.height)) {
        x.record_dimensions = ' -s ' + e.width + 'x' + e.height
    } else {
        x.record_dimensions = ''
    }
    if (e.details.stream_scale_x && e.details.stream_scale_x !== '' && e.details.stream_scale_y && e.details.stream_scale_y !== '') {
        x.ratio = e.details.stream_scale_x + 'x' + e.details.stream_scale_y;
    }
    //record - segmenting
    x.segment = ' -f segment -segment_atclocktime 1 -reset_timestamps 1 -strftime 1 -segment_list pipe:2 -segment_time ' + (60 * e.cutoff) + ' "' + e.dir + '%Y-%m-%dT%H-%M-%S.' + e.ext + '"';
    //record - set defaults for extension, video quality
    switch (e.ext) {
        case 'mp4':
            x.vcodec = 'libx264';
            x.acodec = 'aac';
            if (e.details.crf && e.details.crf !== '') { x.vcodec += ' -crf ' + e.details.crf }
            break;
        case 'webm':
            x.acodec = 'libvorbis', x.vcodec = 'libvpx';
            if (e.details.crf && e.details.crf !== '') { x.vcodec += ' -q:v ' + e.details.crf } else { x.vcodec += ' -q:v 1'; }
            break;
    }
    if (e.details.vcodec === 'h264_vaapi') {
        x.record_video_filters.push('format=nv12,hwupload');
    }
    //record - use custom video codec
    if (e.details.vcodec && e.details.vcodec !== '' && e.details.vcodec !== 'default') { x.vcodec = e.details.vcodec }
    //record - use custom audio codec
    if (e.details.acodec && e.details.acodec !== '' && e.details.acodec !== 'default') { x.acodec = e.details.acodec }
    if (e.details.cust_record) {
        if (x.acodec == 'aac' && e.details.cust_record.indexOf('-strict -2') === -1) { e.details.cust_record += ' -strict -2'; }
        if (e.details.cust_record.indexOf('-threads') === -1) { e.details.cust_record += ' -threads 1'; }
    }
    //    if(e.details.cust_input&&(e.details.cust_input.indexOf('-use_wallclock_as_timestamps 1')>-1)===false){e.details.cust_input+=' -use_wallclock_as_timestamps 1';}
    //record - ready or reset codecs
    if (x.acodec !== 'no') {
        if (x.acodec.indexOf('none') > -1) { x.acodec = '' } else { x.acodec = ' -acodec ' + x.acodec }
    } else {
        x.acodec = ' -an'
    }
    if (x.vcodec.indexOf('none') > -1) { x.vcodec = '' } else { x.vcodec = ' -vcodec ' + x.vcodec }
    //record - frames per second (fps)
    if (e.fps && e.fps !== '' && e.details.vcodec !== 'copy') { x.record_fps = ' -r ' + e.fps } else { x.record_fps = '' }
    //stream - frames per second (fps)
    if (e.details.stream_fps && e.details.stream_fps !== '') { x.stream_fps = ' -r ' + e.details.stream_fps } else { x.stream_fps = '' }
    //record - timestamp options for -vf
    if (e.details.timestamp && e.details.timestamp == "1" && e.details.vcodec !== 'copy') {
        //font
        if (e.details.timestamp_font && e.details.timestamp_font !== '') { x.time_font = e.details.timestamp_font } else { x.time_font = '/usr/share/fonts/truetype/freefont/FreeSans.ttf' }
        //position x
        if (e.details.timestamp_x && e.details.timestamp_x !== '') { x.timex = e.details.timestamp_x } else { x.timex = '(w-tw)/2' }
        //position y
        if (e.details.timestamp_y && e.details.timestamp_y !== '') { x.timey = e.details.timestamp_y } else { x.timey = '0' }
        //text color
        if (e.details.timestamp_color && e.details.timestamp_color !== '') { x.time_color = e.details.timestamp_color } else { x.time_color = 'white' }
        //box color
        if (e.details.timestamp_box_color && e.details.timestamp_box_color !== '') { x.time_box_color = e.details.timestamp_box_color } else { x.time_box_color = '0x00000000@1' }
        //text size
        if (e.details.timestamp_font_size && e.details.timestamp_font_size !== '') { x.time_font_size = e.details.timestamp_font_size } else { x.time_font_size = '10' }

        x.record_video_filters.push('drawtext=fontfile=' + x.time_font + ':text=\'%{localtime}\':x=' + x.timex + ':y=' + x.timey + ':fontcolor=' + x.time_color + ':box=1:boxcolor=' + x.time_box_color + ':fontsize=' + x.time_font_size);
    }
    //record - watermark for -vf
    if (e.details.watermark && e.details.watermark == "1" && e.details.watermark_location && e.details.watermark_location !== '') {
        switch (e.details.watermark_position) {
            case 'tl': //top left
                x.watermark_position = '10:10'
                break;
            case 'tr': //top right
                x.watermark_position = 'main_w-overlay_w-10:10'
                break;
            case 'bl': //bottom left
                x.watermark_position = '10:main_h-overlay_h-10'
                break;
            default: //bottom right
                x.watermark_position = '(main_w-overlay_w-10)/2:(main_h-overlay_h-10)/2'
                break;
        }
        x.record_video_filters.push('movie=' + e.details.watermark_location + '[watermark],[in][watermark]overlay=' + x.watermark_position + '[out]');
    }
    //record - rotation
    if (e.details.rotate_record && e.details.rotate_record !== "" && e.details.rotate_record !== "no" && e.details.stream_vcodec !== "copy") {
        x.record_video_filters.push('transpose=' + e.details.rotate_record);
    }
    //check custom record filters for -vf
    if (e.details.vf && e.details.vf !== '') {
        x.record_video_filters.push(e.details.vf)
    }
    //compile filter string for -vf
    if (x.record_video_filters.length > 0) {
        x.record_video_filters = ' -vf ' + x.record_video_filters.join(',')
    } else {
        x.record_video_filters = ''
    }
    //stream - timestamp
    if (e.details.stream_timestamp && e.details.stream_timestamp == "1" && e.details.vcodec !== 'copy') {
        //font
        if (e.details.stream_timestamp_font && e.details.stream_timestamp_font !== '') { x.stream_timestamp_font = e.details.stream_timestamp_font } else { x.stream_timestamp_font = '/usr/share/fonts/truetype/freefont/FreeSans.ttf' }
        //position x
        if (e.details.stream_timestamp_x && e.details.stream_timestamp_x !== '') { x.stream_timestamp_x = e.details.stream_timestamp_x } else { x.stream_timestamp_x = '(w-tw)/2' }
        //position y
        if (e.details.stream_timestamp_y && e.details.stream_timestamp_y !== '') { x.stream_timestamp_y = e.details.stream_timestamp_y } else { x.stream_timestamp_y = '0' }
        //text color
        if (e.details.stream_timestamp_color && e.details.stream_timestamp_color !== '') { x.stream_timestamp_color = e.details.stream_timestamp_color } else { x.stream_timestamp_color = 'white' }
        //box color
        if (e.details.stream_timestamp_box_color && e.details.stream_timestamp_box_color !== '') { x.stream_timestamp_box_color = e.details.stream_timestamp_box_color } else { x.stream_timestamp_box_color = '0x00000000@1' }
        //text size
        if (e.details.stream_timestamp_font_size && e.details.stream_timestamp_font_size !== '') { x.stream_timestamp_font_size = e.details.stream_timestamp_font_size } else { x.stream_timestamp_font_size = '10' }

        x.stream_video_filters.push('drawtext=fontfile=' + x.stream_timestamp_font + ':text=\'%{localtime}\':x=' + x.stream_timestamp_x + ':y=' + x.stream_timestamp_y + ':fontcolor=' + x.stream_timestamp_color + ':box=1:boxcolor=' + x.stream_timestamp_box_color + ':fontsize=' + x.stream_timestamp_font_size);
    }
    //stream - watermark for -vf
    if (e.details.stream_watermark && e.details.stream_watermark == "1" && e.details.stream_watermark_location && e.details.stream_watermark_location !== '') {
        switch (e.details.stream_watermark_position) {
            case 'tl': //top left
                x.stream_watermark_position = '10:10'
                break;
            case 'tr': //top right
                x.stream_watermark_position = 'main_w-overlay_w-10:10'
                break;
            case 'bl': //bottom left
                x.stream_watermark_position = '10:main_h-overlay_h-10'
                break;
            default: //bottom right
                x.stream_watermark_position = '(main_w-overlay_w-10)/2:(main_h-overlay_h-10)/2'
                break;
        }
        x.stream_video_filters.push('movie=' + e.details.stream_watermark_location + '[watermark],[in][watermark]overlay=' + x.stream_watermark_position + '[out]');
    }
    //stream - rotation
    if (e.details.rotate_stream && e.details.rotate_stream !== "" && e.details.rotate_stream !== "no" && e.details.stream_vcodec !== 'copy') {
        x.stream_video_filters.push('transpose=' + e.details.rotate_stream);
    }
    //stream - hls vcodec
    if (e.details.stream_vcodec && e.details.stream_vcodec !== 'no') {
        if (e.details.stream_vcodec !== '') { x.stream_vcodec = ' -c:v ' + e.details.stream_vcodec } else { x.stream_vcodec = ' -c:v libx264' }
    } else {
        x.stream_vcodec = '';
    }
    //stream - hls acodec
    if (e.details.stream_acodec !== 'no') {
        if (e.details.stream_acodec && e.details.stream_acodec !== '') { x.stream_acodec = ' -c:a ' + e.details.stream_acodec } else { x.stream_acodec = '' }
    } else {
        x.stream_acodec = ' -an';
    }
    //stream - hls segment time
    if (e.details.hls_time && e.details.hls_time !== '') { x.hls_time = e.details.hls_time } else { x.hls_time = "2" } //hls list size
    if (e.details.hls_list_size && e.details.hls_list_size !== '') { x.hls_list_size = e.details.hls_list_size } else { x.hls_list_size = 2 }
    //stream - custom flags
    if (e.details.cust_stream && e.details.cust_stream !== '') { x.cust_stream = ' ' + e.details.cust_stream } else { x.cust_stream = '' }
    //stream - preset
    if (e.details.preset_stream && e.details.preset_stream !== '') { x.preset_stream = ' -preset ' + e.details.preset_stream; } else { x.preset_stream = '' }
    //stream - quality
    //hardware acceleration
    if (e.details.accelerator && e.details.accelerator === '1') {
        if (e.details.hwaccel && e.details.hwaccel !== '') {
            x.hwaccel += ' -hwaccel ' + e.details.hwaccel;
        }
        if (e.details.hwaccel_vcodec && e.details.hwaccel_vcodec !== '') {
            x.hwaccel += ' -c:v ' + e.details.hwaccel_vcodec;
        }
        if (e.details.hwaccel_device && e.details.hwaccel_device !== '') {
            switch (e.details.hwaccel) {
                case 'vaapi':
                    x.hwaccel += ' -vaapi_device ' + e.details.hwaccel_device;
                    break;
                default:
                    x.hwaccel += ' -hwaccel_device ' + e.details.hwaccel_device;
                    break;
            }
        }
        //        else{
        //            if(e.details.hwaccel==='vaapi'){
        //                x.hwaccel+=' -hwaccel_device 0';
        //            }
        //        }
    }
    if (e.details.stream_vcodec === 'h264_vaapi') {
        x.stream_video_filters = []
        x.stream_video_filters.push('format=nv12,hwupload');
        if (e.details.stream_scale_x && e.details.stream_scale_x !== '' && e.details.stream_scale_y && e.details.stream_scale_y !== '') {
            x.stream_video_filters.push('scale_vaapi=w=' + e.details.stream_scale_x + ':h=' + e.details.stream_scale_y)
        }
    }
    //stream - video filter
    if (e.details.svf && e.details.svf !== '') {
        x.stream_video_filters.push(e.details.svf)
    }
    if (x.stream_video_filters.length > 0) {
        x.stream_video_filters = ' -vf ' + x.stream_video_filters.join(',')
    } else {
        x.stream_video_filters = ''
    }
    //stream - pipe build
    if (e.details.input_map_choices && e.details.input_map_choices.stream) {
        //add input feed map
        x.pipe += createFFmpegMap(e.details.input_map_choices.stream)
    }
    if (e.details.stream_vcodec !== 'copy') {
        x.cust_stream += x.stream_fps
    }
    switch (e.details.stream_type) {
        case 'mp4':
            x.cust_stream += ' -movflags +frag_keyframe+empty_moov+default_base_moof -metadata title="Poseidon Stream" -reset_timestamps 1'
            if (e.details.stream_vcodec !== 'copy') {
                if (x.cust_stream.indexOf('-s ') === -1) { x.cust_stream += ' -s ' + x.ratio }
                if (e.details.stream_quality && e.details.stream_quality !== '') x.cust_stream += ' -crf ' + e.details.stream_quality;
                x.cust_stream += x.preset_stream
                x.cust_stream += x.stream_video_filters
            }
            x.pipe += ' -f mp4' + x.stream_acodec + x.stream_vcodec + x.cust_stream + ' pipe:1';
            break;
        case 'flv':
            if (e.details.stream_vcodec !== 'copy') {
                if (x.cust_stream.indexOf('-s ') === -1 && x.ratio) { x.cust_stream += ' -s ' + x.ratio }
                if (e.details.stream_quality && e.details.stream_quality !== '') x.cust_stream += ' -crf ' + e.details.stream_quality;
                x.cust_stream += x.preset_stream
                x.cust_stream += x.stream_video_filters
            }
            x.pipe += ' -f flv' + x.stream_acodec + x.stream_vcodec + x.cust_stream + ' pipe:1';
            break;
        case 'hls':
            if (e.details.stream_vcodec !== 'h264_vaapi' && e.details.stream_vcodec !== 'copy') {
                if (e.details.stream_quality && e.details.stream_quality !== '') x.cust_stream += ' -crf ' + e.details.stream_quality;
                if (x.cust_stream.indexOf('-tune') === -1) { x.cust_stream += ' -tune zerolatency' }
                if (x.cust_stream.indexOf('-g ') === -1) { x.cust_stream += ' -g 1' }
                if (x.cust_stream.indexOf('-s ') === -1 && x.ratio) { x.cust_stream += ' -s ' + x.ratio }
                x.cust_stream += x.stream_video_filters
            }
            x.pipe += x.preset_stream + x.stream_acodec + x.stream_vcodec + ' -f hls' + x.cust_stream + ' -hls_time ' + x.hls_time + ' -hls_list_size ' + x.hls_list_size + ' -start_number 0 -hls_allow_cache 0 -hls_flags +delete_segments+omit_endlist "' + e.sdir + 's.m3u8"';
            break;
        case 'mjpeg':
            if (e.details.stream_quality && e.details.stream_quality !== '') x.cust_stream += ' -q:v ' + e.details.stream_quality;
            x.pipe += ' -c:v mjpeg -f mpjpeg -boundary_tag shinobi' + x.cust_stream + x.stream_video_filters + ' -s ' + x.ratio + ' pipe:1';
            break;
        case 'b64':
        case '':
        case undefined:
        case null: //base64
            if (e.details.stream_quality && e.details.stream_quality !== '') x.cust_stream += ' -q:v ' + e.details.stream_quality;
            x.pipe += ' -c:v mjpeg -f image2pipe' + x.cust_stream + x.stream_video_filters + ' -s ' + x.ratio + ' pipe:1';
            break;
        default:
            x.pipe = ''
            break;
    }
    if (e.details.stream_channels) {
        e.details.stream_channels.forEach(function(v, n) {
            x.pipe += createStreamChannel(n + config.pipeAddition, v)
        })
    }
    //detector - plugins, motion
    if (e.details.detector === '1' && e.details.detector_send_frames === '1') {
        if (e.details.input_map_choices && e.details.input_map_choices.detector) {
            //add input feed map
            x.pipe += createFFmpegMap(e.details.input_map_choices.detector)
        }
        if (!e.details.detector_fps || e.details.detector_fps === '') { e.details.detector_fps = 2 }
        if (e.details.detector_scale_x && e.details.detector_scale_x !== '' && e.details.detector_scale_y && e.details.detector_scale_y !== '') { x.dratio = ' -s ' + e.details.detector_scale_x + 'x' + e.details.detector_scale_y } else { x.dratio = ' -s 320x240' }
        if (e.details.cust_detect && e.details.cust_detect !== '') { x.cust_detect += e.details.cust_detect; }
        if (e.details.detector_pam === '1') {
            x.pipe += ' -an -c:v pam -pix_fmt gray -f image2pipe -vf fps=' + e.details.detector_fps + x.cust_detect + x.dratio + ' pipe:3';
        } else {
            x.pipe += ' -f singlejpeg -vf fps=' + e.details.detector_fps + x.cust_detect + x.dratio + ' pipe:3';
        }
    }
    //api - snapshot bin/ cgi.bin (JPEG Mode)
    if (e.details.snap === '1') {
        if (e.details.input_map_choices && e.details.input_map_choices.snap) {
            //add input feed map
            x.pipe += createFFmpegMap(e.details.input_map_choices.snap)
        }
        if (!e.details.snap_fps || e.details.snap_fps === '') { e.details.snap_fps = 1 }
        if (e.details.snap_vf && e.details.snap_vf !== '') { x.snap_vf = ' -vf ' + e.details.snap_vf } else { x.snap_vf = '' }
        if (e.details.snap_scale_x && e.details.snap_scale_x !== '' && e.details.snap_scale_y && e.details.snap_scale_y !== '') { x.snap_ratio = ' -s ' + e.details.snap_scale_x + 'x' + e.details.snap_scale_y } else { x.snap_ratio = '' }
        if (e.details.cust_snap && e.details.cust_snap !== '') { x.cust_snap = ' ' + e.details.cust_snap; } else { x.cust_snap = '' }
        x.pipe += ' -update 1 -r ' + e.details.snap_fps + x.cust_snap + x.snap_ratio + x.snap_vf + ' "' + e.sdir + 's.jpg" -y';
    }
    //Traditional Recording Buffer
    if (e.details.detector == '1' && e.details.detector_trigger == '1' && e.details.detector_record_method === 'sip') {
        if (e.details.input_map_choices && e.details.input_map_choices.detector_sip_buffer) {
            //add input feed map
            x.pipe += createFFmpegMap(e.details.input_map_choices.detector_sip_buffer)
        }
        x.detector_buffer_filters = []
        if (!e.details.detector_buffer_vcodec || e.details.detector_buffer_vcodec === '' || e.details.detector_buffer_vcodec === 'auto') {
            switch (e.type) {
                case 'h264':
                case 'hls':
                case 'mp4':
                    e.details.detector_buffer_vcodec = 'copy'
                    break;
                default:
                    e.details.detector_buffer_vcodec = 'libx264'
                    break;
            }
        }
        if (!e.details.detector_buffer_acodec || e.details.detector_buffer_acodec === '' || e.details.detector_buffer_acodec === 'auto') {
            switch (e.type) {
                case 'h264':
                case 'hls':
                case 'mp4':
                    e.details.detector_buffer_acodec = 'copy'
                    break;
                default:
                    e.details.detector_buffer_acodec = 'aac'
                    break;
            }
        }
        if (e.details.detector_buffer_acodec === 'no') {
            x.detector_buffer_acodec = ' -an'
        } else {
            x.detector_buffer_acodec = ' -c:a ' + e.details.detector_buffer_acodec
        }
        if (!e.details.detector_buffer_tune || e.details.detector_buffer_tune === '') { e.details.detector_buffer_tune = 'zerolatency' }
        if (!e.details.detector_buffer_g || e.details.detector_buffer_g === '') { e.details.detector_buffer_g = '1' }
        if (!e.details.detector_buffer_hls_time || e.details.detector_buffer_hls_time === '') { e.details.detector_buffer_hls_time = '2' }
        if (!e.details.detector_buffer_hls_list_size || e.details.detector_buffer_hls_list_size === '') { e.details.detector_buffer_hls_list_size = '4' }
        if (!e.details.detector_buffer_start_number || e.details.detector_buffer_start_number === '') { e.details.detector_buffer_start_number = '0' }
        if (!e.details.detector_buffer_live_start_index || e.details.detector_buffer_live_start_index === '') { e.details.detector_buffer_live_start_index = '-3' }

        if (e.details.detector_buffer_vcodec.indexOf('_vaapi') > -1) {
            if (x.hwaccel.indexOf('-vaapi_device') > -1) {
                x.detector_buffer_filters.push('format=nv12')
                x.detector_buffer_filters.push('hwupload')
            } else {
                e.details.detector_buffer_vcodec = 'libx264'
            }
        }
        if (e.details.detector_buffer_vcodec !== 'copy') {
            if (e.details.detector_buffer_fps && e.details.detector_buffer_fps !== '') {
                x.detector_buffer_fps = ' -r ' + e.details.detector_buffer_fps
            } else {
                x.detector_buffer_fps = ' -r 30'
            }
        } else {
            x.detector_buffer_fps = ''
        }
        if (x.detector_buffer_filters.length > 0) {
            x.pipe += ' -vf ' + x.detector_buffer_filters.join(',')
        }
        x.pipe += x.detector_buffer_fps + x.detector_buffer_acodec + ' -c:v ' + e.details.detector_buffer_vcodec + ' -f hls -tune ' + e.details.detector_buffer_tune + ' -g ' + e.details.detector_buffer_g + ' -hls_time ' + e.details.detector_buffer_hls_time + ' -hls_list_size ' + e.details.detector_buffer_hls_list_size + ' -start_number ' + e.details.detector_buffer_start_number + ' -live_start_index ' + e.details.detector_buffer_live_start_index + ' -hls_allow_cache 0 -hls_flags +delete_segments+omit_endlist "' + e.sdir + 'detectorStream.m3u8"'
    }
    //custom - output
    if (e.details.custom_output && e.details.custom_output !== '') { x.pipe += ' ' + e.details.custom_output; }
    //custom - input flags
    if (e.details.cust_input && e.details.cust_input !== '') { x.cust_input += ' ' + e.details.cust_input; }
    //logging - level
    if (e.details.loglevel && e.details.loglevel !== '') { x.loglevel = '-loglevel ' + e.details.loglevel; } else { x.loglevel = '-loglevel error' }
    //build record string.
    if (e.mode === 'record') {
        if (e.details.input_map_choices && e.details.input_map_choices.record) {
            //add input feed map
            x.record_string += createFFmpegMap(e.details.input_map_choices.record)
        }
        //if h264, hls, mp4, or local add the audio codec flag
        switch (e.type) {
            case 'h264':
            case 'hls':
            case 'mp4':
            case 'local':
                x.record_string += x.acodec;
                break;
        }
        //custom flags
        if (e.details.cust_record && e.details.cust_record !== '') { x.record_string += ' ' + e.details.cust_record; }
        //preset flag
        if (e.details.preset_record && e.details.preset_record !== '') { x.record_string += ' -preset ' + e.details.preset_record; }
        //main string write
        x.record_string += x.vcodec + x.record_fps + x.record_video_filters + x.record_dimensions + x.segment;
    }
    //create executeable FFMPEG command
    x.ffmpegCommandString = x.loglevel + x.input_fps;
    //progress pipe
    //    x.ffmpegCommandString += ' -progress pipe:5';
    //add main input
    if ((e.type === 'mp4' || e.type === 'mjpeg') && x.cust_input.indexOf('-re') === -1) {
        x.cust_input += ' -re'
    }
    switch (e.type) {
        case 'dashcam':
            x.ffmpegCommandString += ' -i -';
            break;
        case 'socket':
        case 'jpeg':
        case 'pipe':
            x.ffmpegCommandString += ' -pattern_type glob -f image2pipe' + x.record_fps + ' -vcodec mjpeg' + x.cust_input + ' -i -';
            break;
        case 'mjpeg':
            x.ffmpegCommandString += ' -reconnect 1 -f mjpeg' + x.cust_input + ' -i "' + e.url + '"';
            break;
        case 'h264':
        case 'hls':
        case 'mp4':
            x.ffmpegCommandString += x.cust_input + x.hwaccel + ' -i "' + e.url + '"';
            break;
        case 'local':
            x.ffmpegCommandString += x.cust_input + ' -i "' + e.path + '"';
            break;
    }
    //add extra input maps
    if (e.details.input_maps) {
        e.details.input_maps.forEach(function(v, n) {
            x.ffmpegCommandString += createInputMap(n + 1, v)
        })
    }
    //add recording and stream outputs
    x.ffmpegCommandString += x.record_string + x.pipe
        //hold ffmpeg command for log stream
    s.group[e.ke].mon[e.mid].ffmpeg = x.ffmpegCommandString;
    //create additional pipes from ffmpeg
    x.stdioPipes = [];
    var times = config.pipeAddition;
    if (e.details.stream_channels) {
        times += e.details.stream_channels.length
    }
    for (var i = 0; i < times; i++) {
        x.stdioPipes.push('pipe')
    }
    x.ffmpegCommandString = s.splitForFFPMEG(x.ffmpegCommandString.replace(/\s+/g, ' ').trim())
    return spawn(config.ffmpegDir, x.ffmpegCommandString, { detached: true, stdio: x.stdioPipes });
}
s.file = function(x, e) {
    if (!e) { e = {} };
    switch (x) {
        case 'size':
            return fs.statSync(e.filename)["size"];
            break;
        case 'delete':
            if (!e) { return false; }
            return exec('rm -f ' + e, { detached: true });
            break;
        case 'delete_folder':
            if (!e) { return false; }
            return exec('rm -rf ' + e, { detached: true });
            break;
        case 'delete_files':
            if (!e.age_type) { e.age_type = 'min' };
            if (!e.age) { e.age = '1' };
            exec('find ' + e.path + ' -type f -c' + e.age_type + ' +' + e.age + ' -exec rm -f {} +', { detached: true });
            break;
    }
}

//function for receiving detector data
s.pluginEventController = function(d) {
        switch (d.f) {
            case 'trigger':
                camera.camera('motion', d)
                break;
            case 's.tx':
                misc.tx(d.data, d.to)
                break;
            case 'sql':
                sql.query(d.query, d.values);
                break;
            case 'log':
                logging.systemLog('PLUGIN : ' + d.plug + ' : ', d)
                break;
        }
    }
    //multi plugin connections
s.connectedPlugins = {}
s.pluginInitiatorSuccess = function(mode, d, cn) {
    logging.systemLog('pluginInitiatorSuccess', d)
    if (mode === 'client') {
        //is in client mode (camera.js is client)
        cn.pluginEngine = d.plug
        if (!s.connectedPlugins[d.plug]) {
            s.connectedPlugins[d.plug] = { plug: d.plug }
        }
        logging.systemLog('Connected to plugin : Detector - ' + d.plug + ' - ' + d.type)
        switch (d.type) {
            default:
                case 'detector':
                s.ocv = { started: moment(), id: cn.id, plug: d.plug, notice: d.notice, isClientPlugin: true };
            cn.ocv = 1;
            misc.tx({ f: 'detector_plugged', plug: d.plug, notice: d.notice }, 'CPU')
            break;
        }
    } else {
        //is in host mode (camera.js is client)
        switch (d.type) {
            default:
                case 'detector':
                s.ocv = { started: moment(), id: "host", plug: d.plug, notice: d.notice, isHostPlugin: true };
            break;
        }
    }
    s.connectedPlugins[d.plug].plugged = true
    misc.tx({ f: 'readPlugins', ke: d.ke }, 'CPU')
    misc.ocvTx({ f: 'api_key', key: d.plug })
    s.api[d.plug] = { pluginEngine: d.plug, permissions: {}, details: {}, ip: '0.0.0.0' };
}
s.pluginInitiatorFail = function(mode, d, cn) {
    s.connectedPlugins[d.plug].plugged = false
    if (mode === 'client') {
        //is in client mode (camera.js is client)
        cn.disconnect()
    } else {
        //is in host mode (camera.js is client)
    }
}
if (config.plugins && config.plugins.length > 0) {
    config.plugins.forEach(function(v) {
        s.connectedPlugins[v.id] = { plug: v.id }
        if (v.enabled === false) { return }
        if (v.mode === 'host') {
            //is in host mode (camera.js is client)
            if (v.https === true) {
                v.https = 'https://'
            } else {
                v.https = 'http://'
            }
            if (!v.port) {
                v.port = 80
            }
            var socket = socketIOclient(v.https + v.host + ':' + v.port)
            s.connectedPlugins[v.id].tx = function(x) { return socket.emit('f', x) }
            socket.on('connect', function(cn) {
                logging.systemLog('Connected to plugin (host) : ' + v.id)
                s.connectedPlugins[v.id].tx({ f: 'init_plugin_as_host', key: v.key })
            });
            socket.on('init', function(d) {
                logging.systemLog('Initialize Plugin : Host', d)
                if (d.ok === true) {
                    s.pluginInitiatorSuccess("host", d)
                } else {
                    s.pluginInitiatorFail("host", d)
                }
            });
            socket.on('ocv', s.pluginEventController);
            socket.on('disconnect', function() {
                s.connectedPlugins[v.id].plugged = false
                delete(s.api[v.id])
                logging.systemLog('Plugin Disconnected : ' + v.id)
                s.connectedPlugins[v.id].reconnector = setInterval(function() {
                    if (socket.connected === true) {
                        clearInterval(s.connectedPlugins[v.id].reconnector)
                    } else {
                        socket.connect()
                    }
                }, 1000 * 2)
            });
            s.connectedPlugins[v.id].ws = socket;
        }
    })
}
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
                    sql.query('SELECT * FROM Users WHERE mail=? AND (pass=? OR pass=?)', [params.username, params.password, misc.md5(params.password)], function(err, r) {
                        if (r && r[0]) {
                            r = r[0];
                            r.ip = '0.0.0.0';
                            r.auth = misc.gid(20);
                            params.auth = r.auth;
                            r.details = JSON.parse(r.details);
                            r.permissions = {};
                            s.api[r.auth] = r;
                            clearAfterTime();
                            finish(r);
                        } else {
                            failed();
                        }
                    })
                } else {
                    //not using plain login
                    sql.query('SELECT * FROM API WHERE code=? AND ke=?', [params.auth, params.ke], function(err, r) {
                        if (r && r[0]) {
                            r = r[0];
                            s.api[params.auth] = { ip: r.ip, uid: r.uid, ke: r.ke, permissions: JSON.parse(r.details), details: {} };
                            sql.query('SELECT details FROM Users WHERE uid=? AND ke=?', [r.uid, r.ke], function(err, rr) {
                                if (rr && rr[0]) {
                                    rr = rr[0];
                                    try {
                                        s.api[params.auth].mail = rr.mail
                                        s.api[params.auth].details = JSON.parse(rr.details)
                                        s.api[params.auth].lang = s.getLanguageFile(s.api[params.auth].details.lang)
                                    } catch (er) {}
                                }
                                finish(s.api[params.auth]);
                            })
                        } else {
                            sql.query('SELECT * FROM Users WHERE auth=? AND ke=?', [params.auth, params.ke], function(err, r) {
                                if (r && r[0]) {
                                    r = r[0];
                                    r.ip = '0.0.0.0'
                                    s.api[params.auth] = r
                                    s.api[params.auth].details = JSON.parse(r.details)
                                    s.api[params.auth].permissions = {}
                                    clearAfterTime()
                                    finish(r)
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
        req.super = require(location.super);
        req.super.forEach(function(v, n) {
            if (x.md5 === true) {
                x.pass = misc.md5(x.pass);
            }
            if (x.mail.toLowerCase() === v.mail.toLowerCase() && x.pass === v.pass) {
                req.found = 1;
                if (x.users === true) {
                    sql.query('SELECT * FROM Users WHERE details NOT LIKE ?', ['%"sub"%'], function(err, r) {
                        callback({ $user: v, users: r, config: config, lang: lang })
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

pages.init();

try {
    s.cpuUsage = function(e) {
        k = {}
        switch (s.platform) {
            case 'win32':
                k.cmd = "@for /f \"skip=1\" %p in ('wmic cpu get loadpercentage') do @echo %p%"
                break;
            case 'darwin':
                k.cmd = "ps -A -o %cpu | awk '{s+=$1} END {print s}'";
                break;
            case 'linux':
                k.cmd = 'LANG=C top -b -n 2 | grep "^' + config.cpuUsageMarker + '" | awk \'{print $2}\' | tail -n1';
                break;
        }
        if (config.customCpuCommand) {
            exec(config.customCpuCommand, { encoding: 'utf8', detached: true }, function(err, d) {
                if (s.isWin === true) {
                    d = d.replace(/(\r\n|\n|\r)/gm, "").replace(/%/g, "")
                }
                e(d)
            });
        } else if (k.cmd) {
            exec(k.cmd, { encoding: 'utf8', detached: true }, function(err, d) {
                if (s.isWin === true) {
                    d = d.replace(/(\r\n|\n|\r)/gm, "").replace(/%/g, "")
                }
                e(d)
            });
        } else {
            e(0)
        }
    }
    s.ramUsage = function(e) {
        k = {}
        switch (s.platform) {
            case 'win32':
                k.cmd = "wmic OS get FreePhysicalMemory /Value"
                break;
            case 'darwin':
                k.cmd = "vm_stat | awk '/^Pages free: /{f=substr($3,1,length($3)-1)} /^Pages active: /{a=substr($3,1,length($3-1))} /^Pages inactive: /{i=substr($3,1,length($3-1))} /^Pages speculative: /{s=substr($3,1,length($3-1))} /^Pages wired down: /{w=substr($4,1,length($4-1))} /^Pages occupied by compressor: /{c=substr($5,1,length($5-1)); print ((a+w)/(f+a+i+w+s+c))*100;}'"
                break;
            default:
                k.cmd = "LANG=C free | grep Mem | awk '{print $4/$2 * 100.0}'";
                break;
        }
        if (k.cmd) {
            exec(k.cmd, { encoding: 'utf8', detached: true }, function(err, d) {
                if (s.isWin === true) {
                    d = (parseInt(d.split('=')[1]) / (s.totalmem / 1000)) * 100
                }
                e(d)
            });
        } else {
            e(0)
        }
    }
    setInterval(function() {
        s.cpuUsage(function(cpu) {
            s.ramUsage(function(ram) {
                misc.tx({ f: 'os', cpu: cpu, ram: ram }, 'CPU');
            })
        })
    }, 10000);
} catch (err) { logging.systemLog(lang['CPU indicator will not work. Continuing...']) }
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
setTimeout(function() {
    //get current disk used for each isolated account (admin user) on startup
    sql.query('SELECT * FROM Users WHERE details NOT LIKE ?', ['%"sub"%'], function(err, r) {
        if (r && r[0]) {
            var count = r.length
            var countFinished = 0
            r.forEach(function(v, n) {
                v.size = 0;
                v.limit = JSON.parse(v.details).size
                sql.query('SELECT * FROM Videos WHERE ke=? AND status!=?', [v.ke, 0], function(err, rr) {
                    ++countFinished
                    if (r && r[0]) {
                        rr.forEach(function(b) {
                            v.size += b.size
                        })
                    }
                    logging.systemLog(v.mail + ' : ' + lang.startUpText0 + ' : ' + rr.length, v.size)
                    s.init('group', v)
                    logging.systemLog(v.mail + ' : ' + lang.startUpText1, countFinished + '/' + count)
                    if (countFinished === count) {
                        logging.systemLog(lang.startUpText2)
                            //preliminary monitor start
                        sql.query('SELECT * FROM Monitors', function(err, r) {
                            if (err) { logging.systemLog(err) }
                            if (r && r[0]) {
                                r.forEach(function(v) {
                                    s.init(0, v);
                                    r.ar = {};
                                    r.ar.id = v.mid;
                                    Object.keys(v).forEach(function(b) {
                                        r.ar[b] = v[b];
                                    })
                                    if (!s.group[v.ke]) {
                                        s.group[v.ke] = {}
                                        s.group[v.ke].mon_conf = {}
                                    }
                                    v.details = JSON.parse(v.details);
                                    s.group[v.ke].mon_conf[v.mid] = v;
                                    camera.camera(v.mode, r.ar);
                                });
                            }
                            s.processReady()
                        });
                    }
                })
            })
        } else {
            s.processReady()
        }
    })
}, 1500)