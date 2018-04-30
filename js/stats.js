module.exports = function(vars) {
    let s = vars['s']
    let sql = vars['sql']
    let logging = vars['logging']
    let camera = vars['camera']
    let lang = vars['lang']
    let module = {};

    module.initDiskMonitor = (timeout = 1500) => {
        setTimeout(diskUsage, timeout)
    }

    let diskUsage = function() {
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
    }
    return module;
}