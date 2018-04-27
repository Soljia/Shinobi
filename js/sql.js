var knex = require('knex');

module.exports = function(vars) {
    let config = vars['config']
    let logging = vars['logging']
    let location = vars['location']
    let module = {};


    var databaseOptions = {
        client: config.databaseType,
        connection: config.db,
    }
    if (databaseOptions.client.indexOf('sqlite') > -1) {
        databaseOptions.client = 'sqlite3';
        databaseOptions.useNullAsDefault = true;
    }
    if (databaseOptions.client === 'sqlite3' && databaseOptions.connection.filename === undefined) {
        databaseOptions.connection.filename = __dirname + "/shinobi.sqlite"
    }
    let databaseEngine = knex(databaseOptions)

    module.applySQLUpdates = function() {
        if (databaseOptions.client === 'mysql') {
            module.query('ALTER TABLE `Videos` ADD COLUMN `details` TEXT NULL DEFAULT NULL AFTER `status`;', function(err) {
                if (err) {
                    logging.systemLog("Critical update 1/2 already applied");
                }
                sql.query("CREATE TABLE IF NOT EXISTS `Files` (`ke` varchar(50) NOT NULL,`mid` varchar(50) NOT NULL,`name` tinytext NOT NULL,`size` float NOT NULL DEFAULT '0',`details` text NOT NULL,`status` int(1) NOT NULL DEFAULT '0') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;", function(err) {
                    if (err) {
                        logging.systemLog("Critical update 2/2 NOT applied, this could be bad");
                    } else {
                        logging.systemLog("Critical update 2/2 already applied");
                    }
                }, true);
            }, true);
        }
    }

    module.mergeQueryValues = function(query, values) {
        if (!values) { values = [] }
        var valuesNotFunction = true;
        if (typeof values === 'function') {
            var onMoveOn = values;
            var values = [];
            valuesNotFunction = false;
        }
        if (!onMoveOn) { onMoveOn = function() {} }
        if (values && valuesNotFunction) {
            var splitQuery = query.split('?')
            var newQuery = ''
            splitQuery.forEach(function(v, n) {
                newQuery += v
                if (values[n]) {
                    if (isNaN(values[n])) {
                        newQuery += "'" + values[n] + "'"
                    } else {
                        newQuery += values[n]
                    }
                }
            })
        } else {
            newQuery = query
        }
        return newQuery
    }

    module.query = function(query, values, onMoveOn, hideLog) {
        if (!values) { values = [] }
        if (typeof values === 'function') {
            var onMoveOn = values;
            var values = [];
        }
        if (!onMoveOn) { onMoveOn = function() {} }
        var mergedQuery = module.mergeQueryValues(query, values)
        return databaseEngine.raw(query, values)
            .asCallback(function(err, r) {
                if (err && config.databaseLogs) {
                    logging.systemLog('sql.query QUERY', query)
                    logging.systemLog('sql.query ERROR', err)
                }
                if (onMoveOn)
                    if (typeof onMoveOn === 'function') {
                        switch (databaseOptions.client) {
                            case 'sqlite3':
                                if (!r) r = []
                                break;
                            default:
                                if (r) r = r[0]
                                break;
                        }
                        onMoveOn(err, r)
                    } else {
                        console.log(onMoveOn)
                    }
            })
    }

    return module;
}