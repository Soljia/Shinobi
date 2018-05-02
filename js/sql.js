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
    let db = knex(databaseOptions)

    module.db = db;
    module.applySQLUpdates = function() {
        if (databaseOptions.client === 'mysql') {
            if (!db.schema.hasColumn('Videos', 'details'))
                db.schema.table('Videos', function(table) {
                    table.string('details', 65535).notNullable();
                })
            else
                winston.log("Critical update 1/2 already applied. `details` already exists in `Videos`.")

            if (!db.schema.hasTable('Files'))
                db.schema.createTable('Files', (table) => {
                    table.increments('id');
                    table.string('ke', 50).notNullable();
                    table.string('mid', 50).notNullable();
                    table.string('name', 255).notNullable();
                    table.float('size').defaultTo(0).notNullable();;
                    table.string('details', 65535).notNullable();
                    table.integer('status').defaultTo(0).notNullable();
                }).catch((e) =>
                    winston.log({ level: 'error', message: "Critical update 2/2 not applied. " + e.toString() })
                )
            else
                winston.log("Critical update 2/2 already applied. `Files` already exists in `ccio`.")
        }
    }

    module.log = function(level, msg, meta, callback) {
        if (!meta.timestamp)
            meta.timestamp = Date.now();

        if (!meta.type)
            meta.type = '';

        knex.table('Logs').insert({ timestamp: meta.timestamp, level: level, type: type, msg: msg });
        callback(null, true);
    }

    /*module.query = function(query, values, onMoveOn, hideLog) {
        if (!values) { values = [] }
        if (typeof values === 'function') {
            var onMoveOn = values;
            var values = [];
        }
        if (!onMoveOn) { onMoveOn = function() {} }
        var mergedQuery = module.mergeQueryValues(query, values)
        return db.raw(query, values)
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
    }*/

    return module;
}