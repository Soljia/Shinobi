var https = require('https');

module.exports = function(vars) {
    let misc = vars['misc']
    let s = vars['s']
    let sql = vars['sql']
    let init = vars['init']
    let logging = vars['logging']
    let camera = vars['camera']


    let module = {}

    module.delete = (x, e, k) => {
        if (!e.filename && e.time) { e.filename = misc.moment(e.time) }
        var filename
        if (e.filename.indexOf('.') > -1) {
            filename = e.filename
        } else {
            filename = e.filename + '.' + e.ext
        }
        if (!e.status) { e.status = 0 }

        sql.select('*').from('Videos').where({ mid: e.mid, ke: e.ke, time: misc.nameToTime(filename) }).asCallback(
            (error, rows) => {
                if (rows && rows[0]) {
                    rows = rows[0]
                    var dir = module.video('getDir', rows)
                    sql('Videos').where({ mid: e.mid, ke: e.ke, time: misc.nameToTime(filename) }).del();
                    sql.query('DELETE FROM Videos WHERE `mid`=? AND `ke`=? AND `time`=?', e.save, function() {
                        fs.stat(dir + filename, function(err, file) {
                            if (err) {
                                logging.systemLog('File Delete Error : ' + e.ke + ' : ' + ' : ' + e.mid, err)
                            }
                            init.init('diskUsedSet', e, -(rows.size / 1000000))
                        })
                        misc.tx({ f: 'video_delete', filename: filename, mid: e.mid, ke: e.ke, time: misc.nameToTime(filename), end: misc.moment(new Date, 'YYYY-MM-DD HH:mm:ss') }, 'GRP_' + e.ke);
                        s.file('delete', dir + filename)
                    })
                }
            }
        );
    }
    module.fn = function(x, e, k) {
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
        if (x !== 'getDir') { e.dir = module.video('getDir', e) }
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
                    init.init('diskUsedSet', e, e.filesizeMB)
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
                                    init.init('diskUsedEmit', e)
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
                                                ev.dir = module.video('getDir', ev) + s.moment(ev.time) + '.' + ev.ext;
                                                k.del.push('(mid=? AND time=?)');
                                                k.ar.push(ev.mid), k.ar.push(ev.time);
                                                s.file('delete', ev.dir);
                                                init.init('diskUsedSet', e, -(ev.size / 1000000))
                                                misc.tx({ f: 'video_delete', ff: 'over_max', filename: s.moment(ev.time) + '.' + ev.ext, mid: ev.mid, ke: ev.ke, time: ev.time, end: s.moment(new Date, 'YYYY-MM-DD HH:mm:ss') }, 'GRP_' + e.ke);
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
                        misc.cx({ f: 'close', d: init.init('noReference', e) }, s.group[e.ke].mon[e.id].child_node_id);
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
                            misc.txWithSubPermissions({
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
                            module.video('diskUseUpdate', e, k)
                        } else {
                            module.video('delete', e);
                            logging.log(e, { type: lang['File Not Exist'], msg: lang.FileNotExistText, ffmpeg: s.group[e.ke].mon[e.id].ffmpeg })
                            if (e.mode && config.restart.onVideoNotExist === true && e.fn) {
                                delete(s.group[e.ke].mon[e.id].open);
                                logging.log(e, { type: lang['Camera is not recording'], msg: { msg: lang.CameraNotRecordingText } });
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
                    misc.txWithSubPermissions({
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
                    //                                       logging.log(e,{type:lang['Webdav Error'],msg:{msg:lang.WebdavErrorText+' <b>/'+webdavUploadDir+'</b>',info:err}})
                    //                                   })
                    //                                   webDAV.putFileContents(webdavUploadDir+k.file,"binary",data).catch(function(err) {
                    //                                       logging.log(e,{type:lang['Webdav Error'],msg:{msg:lang.WebdavErrorText+' <b>/'+webdavUploadDir+'</b>',info:err}})
                    //                                   })
                    //                                   logging.log(e,{type:lang['Webdav Error'],msg:{msg:lang.WebdavErrorText+' <b>/'+webdavUploadDir+'</b>',info:err}})
                    //                               }
                    //                           });
                    //                        });
                    //                    });
                    //                }
                    if (s.group[e.ke].webdav && s.group[e.ke].init.use_webdav !== '0' && s.group[e.ke].init.webdav_save == "1") {
                        fs.readFile(k.dir + k.file, function(err, data) {
                            s.group[e.ke].webdav.putFileContents(s.group[e.ke].init.webdav_dir + e.ke + '/' + e.mid + '/' + k.file, "binary", data)
                                .catch(function(err) {
                                    logging.log(e, { type: lang['Webdav Error'], msg: { msg: lang.WebdavErrorText + ' <b>/' + e.ke + '/' + e.id + '</b>', info: err }, ffmpeg: s.group[e.ke].mon[e.id].ffmpeg })
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
                    module.video('diskUseUpdate', e, k)
                } else {
                    console.log(k)
                }
                break;
        }
    }

    return module;
}