'use strict';

System.register(['app/core/core'], function (_export, _context) {
  "use strict";

  var appEvents, hostname, postgRestHost, influxHost, _prodLineDetails, post, get, alert, distinctElems, reconstruct;

  /**
   * pass in the line, return the line's default start time
   * @param {*} line
   */
  function getLineStartTime(line) {
    var l = line.split(' | ');
    var target = _prodLineDetails.filter(function (line) {
      return line.site === l[0] && line.area === l[1] && line.production_line === l[2];
    });
    if (target.length === 0) {
      return '6:00:00';
    } else {
      if (target[0].start_time) {
        return target[0].start_time;
      } else {
        return '6:00:00';
      }
    }
  }

  /**
   * It sends query to postgres db to get production line details and then
   * set the results global in this utils file for further uses.
   * Then execute the callback funtion when finished.
   */

  _export('getLineStartTime', getLineStartTime);

  function queryProductionLineDetails() {
    var url = postgRestHost + 'equipment?site=not.is.null&area=not.is.null&production_line=not.is.null&equipment=is.null';
    get(url).then(function (res) {
      _prodLineDetails = res;
    }).catch(function (e) {
      alert('error', 'Error', 'An error has occurred due to ' + e + ', please refresh the page and try again');
    });
  }

  _export('queryProductionLineDetails', queryProductionLineDetails);

  return {
    setters: [function (_appCoreCore) {
      appEvents = _appCoreCore.appEvents;
    }],
    execute: function () {
      hostname = window.location.hostname;

      _export('postgRestHost', postgRestHost = 'http://' + hostname + ':5436/');

      _export('postgRestHost', postgRestHost);

      _export('influxHost', influxHost = 'http://' + hostname + ':8086/');

      _export('influxHost', influxHost);

      _prodLineDetails = void 0;

      _export('post', post = function post(url, line) {
        return new Promise(function (resolve, reject) {
          var xhr = new XMLHttpRequest();
          xhr.open('POST', url);
          xhr.onreadystatechange = handleResponse;
          xhr.onerror = function (e) {
            return reject(e);
          };
          xhr.send(line);

          function handleResponse() {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                // console.log('200');
                var res = JSON.parse(xhr.responseText);
                resolve(res);
              } else if (xhr.status === 204) {
                // console.log('204');
                res = xhr.responseText;
                resolve(res);
              } else {
                reject(this.statusText);
              }
            }
          }
        });
      });

      _export('post', post);

      _export('get', get = function get(url) {
        return new Promise(function (resolve, reject) {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url);
          xhr.onreadystatechange = handleResponse;
          xhr.onerror = function (e) {
            return reject(e);
          };
          xhr.send();

          function handleResponse() {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                var res = JSON.parse(xhr.responseText);
                resolve(res);
              } else {
                reject(this.statusText);
              }
            }
          }
        });
      });

      _export('get', get);

      _export('alert', alert = function alert(type, title, msg) {
        appEvents.emit('alert-' + type, [title, msg]);
      });

      _export('alert', alert);

      _export('distinctElems', distinctElems = function distinctElems(list) {
        return Array.from(new Set(list));
      });

      _export('distinctElems', distinctElems);

      _export('reconstruct', reconstruct = function reconstruct(data) {
        if (data.length === 0) {
          return data;
        }

        var cols = data[0].columns;
        var rows = data[0].rows;

        var result = [];
        rows.forEach(function (row) {
          var obj = {};
          cols.forEach(function (col, k) {
            obj[col.text] = row[k];
          });
          result.push(obj);
        });

        return result;
      });

      _export('reconstruct', reconstruct);
    }
  };
});
//# sourceMappingURL=utils.js.map
