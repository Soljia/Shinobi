import { FileController } from '..';

var winston = require('winston')

exports.log = winston.log;
exports.winston = winston;


let defaultOptions = { useDefaults: true }
let actualOptions = Object.assign({}, defaultOptions, options)

let initDefaults = () => {
    // Output to console
    winston.add(winston.transports.Console);
}

if (actualOptions.useDefaults)
    initDefaults();

return winston;