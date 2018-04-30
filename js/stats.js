module.exports = function(vars) {
    let s = vars['s']
    let sql = vars['sql']
    let logging = vars['logging']
    let camera = vars['camera']
    let lang = vars['lang']
    let misc = vars['misc']
    let init = vars['init']
    let config = vars['config']
    let module = {};

    module.initDiskMonitor = (timeout = 1500) => {
        setTimeout(diskUsage, timeout)
    }

    module.init_CPU_Memory_Monitor = (interval = 10000) => {
        setInterval(function() {
            cpuUsage(function(cpu) {
                ramUsage(function(ram) {
                    misc.tx({ f: 'os', cpu: cpu, ram: ram }, 'CPU');
                })
            })
        }, interval);

        //catch (err) { logging.systemLog(lang['CPU indicator will not work. Continuing...']) }
    }

    let cpuUsage = (e) => {
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

    let ramUsage = function(e) {
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
                        init.init('group', v)
                        logging.systemLog(v.mail + ' : ' + lang.startUpText1, countFinished + '/' + count)
                        if (countFinished === count) {
                            logging.systemLog(lang.startUpText2)
                                //preliminary monitor start
                            sql.query('SELECT * FROM Monitors', function(err, r) {
                                if (err) { logging.systemLog(err) }
                                if (r && r[0]) {
                                    r.forEach(function(v) {
                                        init.init(0, v);
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