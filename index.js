"use strict";

var async = require('async');
var Path = require('path');
var _ = require('lodash');

module.exports = function (req, busboy, handleFile) {
  return new Promise(function(resolve, reject) {
    let fields = [];
    var numItems = 0;
    var numProcessed = 0;
    var queue = async.queue(function(work, callback) {
      var _callback = callback;
      callback = _.once(function(err) {
        numProcessed ++;
        _callback(err);
      });

      if ('file' == work.event) {
        work.file
          .on('error', callback)
          .on('end', callback);

        handleFile(work);

      } else if ('field' == work.event) {
        fields.push(work);
        callback();
      }

    }, 1);

    queue.drain = done;

    busboy
      .on('file', function(field, file, filename) {
        numItems ++;
        var ext = Path.extname(filename);
        queue.push({
          event: 'file',
          field: field,
          file: file,
          filename: filename,
          extension: ext
        });
      })
      .on('field', function(key, value, keyTruncated, valueTruncated) {
        numItems ++;
        queue.push({
          event: 'field',
          key: key,
          value: value,
          keyTruncated: keyTruncated,
          valueTruncated: valueTruncated
        });
      })
      .on('finish', done);

    req.pipe(busboy);

    function done() {
      if (numItems == numProcessed) {
        resolve(fields);
      }
    }
  });
};
