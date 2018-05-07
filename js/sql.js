var logging = require('./log.js')
var util = require('util');

module.exports = function(vars) {
    let config = vars['config']
    let location = vars['location']


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
    var knex = require('knex')(databaseOptions)

    let getByID = (objType, id, select = '*', callback) => {
        if(objType !== null && typeof objType === 'object') objType = typeof objType
        knex.select(select)
                    .from(objType)
                    .where({id: id})
                    .asCallback((err, rows) => {
                        if(typeof callback === 'function') callback(rows[0])
                    })
    }

    let addLoggingModule = () => {
        // Our default SQL logger
        let sqlLog = winston.transports.SQL = (options) => {
                var self = this;

                self.name = 'SQL Logger'
                self.level = options.level || 'info'
            }
            // Make our own SQL transport and attach to the sql.log funtion
        util.inherits(SQL, winston.Transport);

        sqlLog.prototype.log = (level, msg, meta, callback) => {
            if (!meta.timestamp)
                meta.timestamp = Date.now();

            if (!meta.type)
                meta.type = '';



            knex.table('Logs').insert({ timestamp: meta.timestamp, level: level, type: type, msg: msg });
            callback(null, true);
        }

        winston.add(winston.transports.SQL, {})
    }

    let applySQLUpdates = function() {
        if (databaseOptions.client === 'mysql') {
            if (!db.schema.hasColumn('Videos', 'details'))
                db.schema.table('Videos', function(table) {
                    table.string('details', 65535).notNullable();
                })
            else
                logging.log("Critical update 1/2 already applied. `details` already exists in `Videos`.")

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
                    logging.log({ level: 'error', message: "Critical update 2/2 not applied. " + e.toString() })
                )
            else
                logging.log("Critical update 2/2 already applied. `Files` already exists in `ccio`.")
        }
    }

    addLoggingModule();
    applySQLUpdates();

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

    return knex;
}