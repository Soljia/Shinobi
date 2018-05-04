global.__base = __dirname + '/';

module.exports.FileController = require('./js/file.js');
module.exports.VideoController = require('.js/video.js');
module.exports.FFMpegController = require('./js/ffmpeg.js');
module.exports.PluginController = require('./js/plugins.js');
module.exports.CameraController = require('./js/camera.js');
module.exports.ConnectionController = require('./js/connection.js');
module.exports.SQL = require('./js/sql.js');
module.exports.Logging = require('./js/log.js');
module.exports.ScreenController = require('./js/screen.js');
module.exports.PageController = require('./js/page.js');
module.exports.Stats = require('./js/stats.js');
module.exports.Init = require('./js/init.js');
module.exports.Misc = require('./js/misc.js');
