var winston = require('winston')

module.export = (options) => {

    let defaultOptions = { useDefaults: true }
    let actualOptions = Object.assign({}, defaultOptions, options)

    let initDefaults = () => {
        // Output to console
        winston.add(winston.transports.Console);
    }

    if (actualOptions.useDefaults)
        initDefaults();

    return winston;
}