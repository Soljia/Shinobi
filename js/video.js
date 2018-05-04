import { Misc, SQL, Logging, CameraController, Init, FileController } from '../index.js';
var path = require('path');

FileController.


module.exports = function(vars) {
    let s = vars['s']
    let output = {}

    output.delete = (video, callback) => {
        if (!video.filename && video.time) { video.filename = Misc.moment(video.time) }
        var filename = video.filename + video.filename.indexOf('.') === -1 ? '.' + video.ext : ''

        video.status = video.status || 0;

        SQL.select('*').from('Videos').where({ mid: video.mid, ke: video.ke, time: Misc.nameToTime(filename) }).asCallback(
            (error, rows) => {
                if (rows && rows[0]) {
                    rows = rows[0]
                    var dir = output.video('getDir', rows)
                    SQL('Videos').where({ mid: video.mid, ke: video.ke, time: Misc.nameToTime(filename) }).del().then(function() {
                        fs.stat(dir + filename, function(err, file) {
                            if (err) {
                                winston.log({ level: 'error', message: "File Delete Error (" + video.ke + ":" + video.mid + ") " + err.toString() })
                                Logging.systemLog('File Delete Error : ' + video.ke + ' : ' + ' : ' + video.mid, err)
                            }
                            Init.init('diskUsedSet', video, -(rows.size / 1000000))
                        })
                        Misc.tx({ f: 'video_delete', filename: filename, mid: video.mid, ke: video.ke, time: Misc.nameToTime(filename), end: Misc.moment(new Date, 'YYYY-MM-DD HH:mm:ss') }, 'GRP_' + video.ke);
                        FileController.delete(path.join(dir, filename))

                    })
                }
            }
        );
    }
    output.fn = function(x, e, k) {
        if (!e) { e = {} };
        switch (x) {
            case 'getDir':
                if (e.mid && !e.id) { e.id = e.mid };
                if (e.details && (e.details instanceof Object) === false) {
                    try { e.details = JSON.parse(e.details) } catch (err) { Logging.log(err) }
                }
                if (e.details && e.details.dir && e.details.dir !== '') {
                    return Misc.checkCorrectPathEnding(e.details.dir) + e.ke + '/' + e.id + '/'
                } else {
                    return s.dir.videos + e.ke + '/' + e.id + '/';
                }
        }
        if (!k) k = {};
        if (x !== 'getDir') { e.dir = output.video('getDir', e) }
        switch (x) {
            case 'fix':
                e.sdir = s.dir.streams + e.ke + '/' + e.id + '/';
                if (!e.filename && e.time) { e.filename = Misc.moment(e.time) }
                if (e.filename.indexOf('.') === -1) {
                    e.filename = e.filename + '.' + e.ext
                }
                Misc.tx({ f: 'video_fix_start', mid: e.mid, ke: e.ke, filename: e.filename }, 'GRP_' + e.ke)
                s.group[e.ke].mon[e.id].fixingVideos[e.filename] = {}
                switch (e.ext) {
                    case 'mp4':
                        e.fixFlags = '-vcodec libx264 -acodec aac -strict -2'
                        break
                    case 'webm':
                        e.fixFlags = '-vcodec libvpx -acodec libvorbis';
                        break
                }
                e.spawn = spawn(config.ffmpegDir, ('-i ' + e.dir + e.filename + ' ' + e.fixFlags + ' ' + e.sdir + e.filename).split(' '), { detached: true })
                e.spawn.stdout.on('data', function(data) {
                    Misc.tx({ f: 'video_fix_data', mid: e.mid, ke: e.ke, filename: e.filename }, 'GRP_' + e.ke)
                });
                e.spawn.on('close', function(data) {
                    exec('mv ' + e.dir + e.filename + ' ' + e.sdir + e.filename, { detached: true }).on('exit', function() {
                        Misc.tx({ f: 'video_fix_success', mid: e.mid, ke: e.ke, filename: e.filename }, 'GRP_' + e.ke)
                        delete(s.group[e.ke].mon[e.id].fixingVideos[e.filename]);
                    })
                });
                break;
            case 'archive':
                if (!e.filename && e.time) { e.filename = Misc.moment(e.time) }
                if (!e.status) { e.status = 0 }
                e.details.archived = "1"
                SQL.table('Videos')
                    .where({ mid: e.id, ke: e.ke, time: Misc.nameToTime(e.filename) })
                    .update({ details: JSON.stringify(e.details) })
                    .asCallback(function(err, rows) {
                        Misc.tx({ f: 'video_edit', status: 3, filename: e.filename + '.' + e.ext, mid: e.mid, ke: e.ke, time: Misc.nameToTime(e.filename) }, 'GRP_' + e.ke);
                    });
                break;

            case 'open':
                //on video open
                e.save = [e.id, e.ke, Misc.nameToTime(e.filename), e.ext];
                if (!e.status) { e.save.push(0) } else { e.save.push(e.status) }
                k.details = {}
                if (e.details && e.details.dir && e.details.dir !== '') {
                    k.details.dir = e.details.dir
                }
                e.save.push(s.s(k.details))
                SQL.table('Videos')
                    .insert({ mid: e.id, ke: e.ke, time: Misc.nameToTime(e.filename), ext: e.exit, status: e.status, details: JSON.stringify(e.details) })
                    .asCallback((err, rows) => {
                        Logging.log({ level: 'debug', message: JSON.stringify(rows) });
                    })
                Misc.tx({ f: 'video_build_start', filename: e.filename + '.' + e.ext, mid: e.id, ke: e.ke, time: Misc.nameToTime(e.filename), end: Misc.moment(new Date, 'YYYY-MM-DD HH:mm:ss') }, 'GRP_' + e.ke);
                break;
            case 'diskUseUpdate':
                if (s.group[e.ke].init) {
                    init.init('diskUsedSet', e, e.filesizeMB)
                    if (config.cron.deleteOverMax === true) {
                        //check space
                        s.group[e.ke].sizePurgeQueue.push(1)
                        if (s.group[e.ke].sizePurging !== true) {
                            //lock this function
                            s.group[e.ke].sizePurging = true
                                //set queue processor
                            var finish = function() {
                                //                    console.log('checkQueueOne',s.group[e.ke].sizePurgeQueue.length)
                                //remove value just used from queue
                                s.group[e.ke].sizePurgeQueue = s.group[e.ke].sizePurgeQueue.splice(1, s.group[e.ke].sizePurgeQueue.length + 10)
                                    //do next one
                                if (s.group[e.ke].sizePurgeQueue.length > 0) {
                                    checkQueue()
                                } else {
                                    //                      console.log('checkQueueFinished',s.group[e.ke].sizePurgeQueue.length)
                                    s.group[e.ke].sizePurging = false
                                    init.init('diskUsedEmit', e)
                                }
                            }
                            var checkQueue = function() {
                                //                    console.log('checkQueue',config.cron.deleteOverMaxOffset)
                                //get first in queue
                                var currentPurge = s.group[e.ke].sizePurgeQueue[0]
                                var deleteVideos = function() {
                                    //                      console.log(s.group[e.ke].usedSpace>(s.group[e.ke].sizeLimit*config.cron.deleteOverMaxOffset))
                                    //run purge command
                                    if (s.group[e.ke].usedSpace > (s.group[e.ke].sizeLimit * config.cron.deleteOverMaxOffset)) {
                                        SQL.select('*')
                                            .from('Videos')
                                            .whereNot('status', 0)
                                            .whereNot('details', 'like', '%"archived":"1"%')
                                            .where('ke', e.ke)
                                            .limit(2)
                                            .asCallback(function(err, rows) {
                                                rows.forEach(function(row) {
                                                    row.dir = output.video('getDir', row) + s.moment(row.time) + '.' + row.ext;

                                                    //If this is too slow, we can certainly do as mass delete outside the forEach function. This should provide the best experience from a usability stand point.
                                                    SQL.table('Videos')
                                                        .where({ mid: row.mid, time: row.time })
                                                        .del()
                                                        .asCallback(function(err, rows) {
                                                            logger.log({ level: 'debug', message: JSON.stringify(rows) })
                                                        })
                                                    s.file('delete', row.dir);
                                                    init.init('diskUsedSet', e, -(row.size / 1000000))
                                                    Misc.tx({ f: 'video_delete', ff: 'over_max', filename: s.moment(row.time) + '.' + row.ext, mid: row.mid, ke: row.ke, time: row.time, end: s.moment(new Date, 'YYYY-MM-DD HH:mm:ss') }, 'GRP_' + e.ke);
                                                });
                                            })
                                    }
                                    finish()
                                }
                                setTimeout(deleteVideos, 1000)
                            }
                            checkQueue()
                        }
                    } else {
                        init.init('diskUsedEmit', e)
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
                        Misc.cx({ f: 'close', d: init.init('noReference', e) }, s.group[e.ke].mon[e.id].child_node_id);
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
                                        k.dir = Misc.checkCorrectPathEnding(v.path) + e.ke + '/' + e.id + '/'
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
                            SQL.table('Videos')
                                .where({ mid: e.id, ke: e.ke, time: Misc.nameToTime(e.filename), status: e.status ? e.status : 0 })
                                .update({ size: e.filesize, status: 1, end: e.end_time })
                                .asCallback((err, rows) => {
                                    logger.log({ level: 'debug', message: JSON.stringify(rows) });
                                })

                            //send event for completed recording
                            Misc.txWithSubPermissions({
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
                            output.video('diskUseUpdate', e, k)
                        } else {
                            output.delete(e);
                            logger.log({ level: 'error', message: "{0}-{1}:{2}".format(e.id, e.ke, JSON.stringify({ type: lang['File Not Exist'], msg: lang.FileNotExistText, ffmpeg: s.group[e.ke].mon[e.id].ffmpeg })) })
                            if (e.mode && config.restart.onVideoNotExist === true && e.fn) {
                                delete(s.group[e.ke].mon[e.id].open);
                                Logging.log(e, { type: lang['Camera is not recording'], msg: { msg: lang.CameraNotRecordingText } });
                                if (s.group[e.ke].mon[e.id].started === 1) {
                                    camera.camera('restart', e)
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
                    Misc.txWithSubPermissions({
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
                    //        var webDAV = s.group[e.ke].webdav
                    //        if(webDAV&&s.group[e.ke].init.use_webdav!=='0'&&s.group[e.ke].init.webdav_save=="1"){
                    //           fs.readFile(k.dir+k.file,  function (err,data){
                    //             var webdavUploadDir = s.group[e.ke].init.webdav_dir+e.ke+'/'+e.mid+'/'
                    //             fs.readFile(k.dir+k.file,  function (err,data){
                    //               webDAV.putFileContents(webdavUploadDir+k.file,"binary",data).catch(  function (err) {
                    //                 if(err){
                    //                   webDAV.createDirectory(webdavUploadDir).catch(  function (err) {
                    //                     Logging.log(e,{type:lang['Webdav Error'],msg:{msg:lang.WebdavErrorText+' <b>/'+webdavUploadDir+'</b>',info:err}})
                    //                   })
                    //                   webDAV.putFileContents(webdavUploadDir+k.file,"binary",data).catch(  function (err) {
                    //                     Logging.log(e,{type:lang['Webdav Error'],msg:{msg:lang.WebdavErrorText+' <b>/'+webdavUploadDir+'</b>',info:err}})
                    //                   })
                    //                   Logging.log(e,{type:lang['Webdav Error'],msg:{msg:lang.WebdavErrorText+' <b>/'+webdavUploadDir+'</b>',info:err}})
                    //                 }
                    //               });
                    //            });
                    //          });
                    //        }
                    if (s.group[e.ke].webdav && s.group[e.ke].init.use_webdav !== '0' && s.group[e.ke].init.webdav_save === "1") {
                        fs.readFile(k.dir + k.file, function(err, data) {
                            s.group[e.ke].webdav.putFileContents(s.group[e.ke].init.webdav_dir + e.ke + '/' + e.mid + '/' + k.file, "binary", data)
                                .catch(function(err) {
                                    Logging.log(e, { type: lang['Webdav Error'], msg: { msg: lang.WebdavErrorText + ' <b>/' + e.ke + '/' + e.id + '</b>', info: err }, ffmpeg: s.group[e.ke].mon[e.id].ffmpeg })
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
                    SQL.query('INSERT INTO Videos (mid,ke,time,ext,status,details,size,end) VALUES (?,?,?,?,?,?,?,?)', save)
                        //send new diskUsage values
                    output.video('diskUseUpdate', e, k)
                } else {
                    console.log(k)
                }
                break;
        }
    }

    return output;
}