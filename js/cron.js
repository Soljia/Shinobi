import { Logging } from '..';
import {Enum} from 'enumify';

var fse = require('fs-extra');
var path = require('path');

class Cron {
  constructor(){}
  cleanBy(options, callback = false){
    if (!options.CleanType instanceof CleanType)
      if (callback instanceof 'function') callback();
  }
}

class CleanType extends Enum {}
CleanType.initEnum(['MaxDate']);

module.export = new Cron();
