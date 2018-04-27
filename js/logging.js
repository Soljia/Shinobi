var moment = require('moment');

module.exports = function(vars) {
    let config = vars['s']
    let logging = vars['config']
    let misc = vars['misc']
    let module = {}
    module.log = function(e, x) {
            if (!x || !e.mid) { return }
            if ((e.details && e.details.sqllog === '1') || e.mid.indexOf('$') > -1) {
                module.sqlCall('INSERT INTO Logs (ke,mid,info) VALUES (?,?,?)', [e.ke, e.mid, s.s(x)]);
            }
            misc.tx({ f: 'log', ke: e.ke, mid: e.mid, log: x, time: moment() }, 'GRPLOG_' + e.ke);
            //    s.systemLog('s.log : ',{f:'log',ke:e.ke,mid:e.mid,log:x,time:moment()},'GRP_'+e.ke)
        }
        //system log
    module.systemLog = function(q, w, e) {
        if (!w) { w = '' }
        if (!e) { e = '' }
        if (config.systemLog === true) {
            if (typeof q === 'string' && s.databaseEngine) {
                module.sqlCall('INSERT INTO Logs (ke,mid,info) VALUES (?,?,?)', ['$', '$SYSTEM', s.s({ type: q, msg: w })]);
                misc.tx({ f: 'log', log: { time: moment(), ke: '$', mid: '$SYSTEM', time: moment(), info: s.s({ type: q, msg: w }) } }, '$');
            }
            return console.log(moment().format(), q, w, e)
        }
    }

    module.sqlCall = false;

    return module;
}