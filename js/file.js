import { Logging } from '..';
var fse = require('fs-extra');
var path = require('path');
import {Enum} from 'enumify';


module.export = (parameters = {}) => {
  let config = parameters.config ? parameters.config : {};


  this.GetFiles = () => {

  };
  /**
   * @param  {string} filename Path to the file
   * @returns {undefined}
   */
  this.size = (filename) => fse.statSync(filename)['size'];

  /**
   * @param  {string} path_ Path to file
   * @param  {object} options Options. {cutOffDate: {integer}}
   * @param  {function} callback=false Callback when file is deleted
   */
  this.delete = (path_, options, callback = false) => {
    let actualOptions = Object.assign({}, config.FileController, options);

    // Delete queue is used if actualOptions.delete.GroupDelete is defined
    let deleteQueue = [];
    // Find and delete all files older than options.cutOffDate
    if (actualOptions.delete.cutOffDate) {

    }

    // If path_ is an array, itterate through it
    if (Array.isArray(path_)) path_.forEach(
      (item) => module.delete(item, {}, callback));
    else {
      // Get path statistics
      fse.stat(path_, (stats) => {
        // If path is a directory
        if (stats.isDirectory()){
          // Read the directory async
          fse.readdir(path_, (error, files) => {
            // Log errors and skip
            if (error) return Logging.log({ level: 'error', message: error });
            // Recurse with array of files that were in directory
            this.delete(files, options, callback);
          });
        // If path is a file
        } else {
          if (!actualOptions.delete.cutOffDate || new Date(stats.ctime) > actualOptions.delete.cutOffDate) {
            // ASync remove file
            fse.remove(path_, (error) => {
              if (error) return Logging.log({level: 'error', message: error});

              if (typeof callback === 'function') callback(path_);
              Logging.log('Deleted ' + path_);
            });
          }
        }
      });
    }
  };
};

class Filter extends Enum {}
Filter.initEnum({
  MaxDate: (files, date) => {
    if (!Array.isArray(files)) files = [files];
    files.forEach((file) => {
      if (!files.stats)
        fse.stat(file, (stats) => {});
    });
  }
});


class File {
  constructor(){
    this.id = '';
    this.name = '';
    this.extension = '';
    this.path = '';
    this.stats = {};
  }

  getFullPath(){
    return path.join(this.path, `${this.name}.${this.extension}`);
  }

  getStats(callback) {
    fse.stat(this.getFullPath(), (err, stats) => {
      if (err) return Logging.error(err);
      this.stats = stats;
      callback(stats);
    });
  };
}
