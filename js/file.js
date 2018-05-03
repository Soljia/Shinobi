'use strict';
import { FileController } from '../index.js';
var fse = require('fs-extra')
var path = require('path')

exports.size = (filename) => fse.statSync(filename)["size"]

exports.delete = (path_, options, callback = false) => {
    let defaultOptions = {}
    let actualOptions = Object.assign({}, defaultOptions, options)

    // Find and delete all files older than options.cutOffDate
    if (actualOptions.cutOffDate) {
        fse.readdir(path_, (err, files) => {
            files.forEach((file) => {
                if (new Date(stat.ctime) > actualOptions.cutOffDate)
                    module.delete(path.join(path_, file), {}, callback);
            })
        })
    }

    // If path_ is an array, itterate through it
    if (Array.isArray(path_)) path_.forEach((item) => module.delete(item, {}, callback));
    else if (!actualOptions.cutOffDate) {
        // ASync remove file
        fse.remove(path_)
            .then(() => {
                callback(path_)
                logging.log("Deleted " + path_)
            })
            .catch(err => logging.log({
                level: 'error',
                message: err
            }))
    }
}