import { FileController } from '..';

var winston = require('winston');

module.exports.log = winston.log;
module.exports.error = (message) => winston.log({level: 'error', message:message});
module.exports.winston = winston;

let actualOptions = Object.assign({}, defaultOptions, options);

let initDefaults = () => {
    // Output to console
    winston.add(winston.transports.Console);
};

if (actualOptions.useDefaults)
    initDefaults();

return winston;