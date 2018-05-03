module.exports = function(vars) {
    let misc = vars['misc']
    let sql = vars['sql']

    let output = {};

    output.config = (config, ProCallback) => {
        if (config.ip === undefined || config.ip === '' || config.ip.indexOf('0.0.0.0') > -1) { config.ip = 'localhost' } else { config.bindip = config.ip };

        if (!config.productType) config.productType = 'CE'

        if (config.productType === 'Pro') ProCallback();
    }

    output.init = function(x, e, k, fn) {
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
                output.init('apps', e)
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
                output.init('diskUsedEmit', e)
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
                        misc.cx({ f: 'sync', sync: output.init('noReference', s.group[e.ke].mon[e.mid]), ke: e.ke, mid: e.mid }, s.child_nodes[v].cnid);
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
                            output.init('diskUsedEmit', e)
                        }
                    }
                    checkQueue()
                }
                break;
        }
        if (typeof e.callback === 'function') { setTimeout(function() { e.callback() }, 500); }
    }

    return output;
}