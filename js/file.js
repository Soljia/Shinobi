var fse = require('fs-extra')
var path = require('path')

module.exports = () =>{
    let module = {}

    module.size = (filename) => fse.statSync(filename)["size"]

    module.delete = (path_, options, callback = false) => {
        let defaultOptions = {}
        let options = Object.assign({}, defaultOptions, options)

        // Find and delete all files older than options.cutOffDate
        if(options.cutOffDate){
            fse.readdir(path_, (err, files) => {
                files.forEach((file) => {
                    if(new Date(stat.ctime) > options.cutOffDate)
                        module.delete(path.join(path_,file), {}, callback);
                })
            })
        }

        // If path_ is an array, itterate through it
        if(Array.isArray(path_)) path_.forEach((item) => module.delete(item, {}, callback));
        else if(!options.cutOffDate) {
            // ASync remove file
            fse.remove(path_)
            .then(() => {
                callback(path_)
                winston.log("Deleted " + path_)
            })
            .catch(err => winston.log({level: 'error', message: err}))
        }

    }
    return module;
}