module.exports = function(vars) {
    let output = {}

    let connectedPlugins_ = {};

    output.connectedPlugins_ = () => {
        return connectedPlugins_;
    }

    output.addPlugin = (plugin, allowDupes = false) => {
        if (!connectedPlugins_.includes(plugin) || allowDupes)
            connectedPlugins_[plugin.id] = { plug: plugin }
    }

    //function for receiving detector data
    output.pluginEventController = function(d) {
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

    let plugin = function() {
        let self = this;

        self.id;
        self.key;
        self.host;
        self.port;
        self.enabled;
        self.mode;
        self.protocol;
        self.tx = function(x) { if (socket) return socket.emit('f', x) }
        self.socket;
        self.reconnectInterval = 2000;
        self.reconnector = (inteveral = reconnectInterval) => {
            setInterval(function() {
                if (!self.socket) return;

                if (self.socket.connected === true) {
                    clearInterval(self.reconnector)
                } else {
                    self.socket.connect()
                }
            }, inteveral)
        }

        //Enums
        self.protocols = Object.freeze({ "http": "http://", "https": "https://" })
        self.modes = Object.freeze({ 'client': 'client', 'host': 'host' })

        self.init = (pluginEventController, callback = false) => {

            // Don't initialize if disabled
            if (self.enabled === false || !pluginEventController) { return }

            // Plugin is host
            if (self.mode === self.modes.host) {
                if (!self.port) {
                    self.port = self.protocol === self.protocols.https ? 443 : 80;
                }

                // Define socket
                self.socket = socketIOclient(self.protocol + self.host + ':' + self.port)
                callback('init', self.id);


                // Socket events
                self.socket.on('connect', function(cn) {
                    callback('connect', self.id)
                    logging.systemLog('Connected to plugin (host) : ' + self.id)
                    self.tx({ f: 'init_plugin_as_host', key: self.key })
                });

                self.socket.on('init', function(d) {
                    logging.systemLog('Initialize Plugin : Host', d)
                    callback('init', self.id, d)
                });

                self.socket.on('ocv', pluginEventController);

                self.socket.on('disconnect', function() {
                    self.tx = function(x) { if (socket) return socket.emit('f', x) }
                    self.reconnector()
                    callback('disconnect', self.id)
                    logging.systemLog('Plugin Disconnected : ' + self.id)
                });
            }

            return self.id;
        }
    }

    return output;
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
    if (!d.ok) {
        s.connectedPlugins[d.plug].plugged = false
        if (mode === 'client') {
            //is in client mode (camera.js is client)
            cn.disconnect()
        } else {
            //is in host mode (camera.js is client)
        }
        return;
    }
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
if (config.plugins && config.plugins.length > 0) {
    config.plugins.forEach(function(v) {
        s.connectedPlugins[self.id] = { plug: v.id }
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