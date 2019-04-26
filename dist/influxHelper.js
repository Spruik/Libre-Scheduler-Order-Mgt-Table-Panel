'use strict';

System.register(['./utils', 'moment'], function (_export, _context) {
  "use strict";

  var utils, moment, writeUrl, hasTurnedAround;


  /**
   * Expect the status string (Normally are: 'Ready' or 'Deleted')
   * Then changed the status in the line with anything else unchanged
   * @param {*} status
   */
  function writeLineForUpdate(status, data) {
    // For influxdb tag keys, must add a forward slash \ before each space
    console.log(data);

    var product_desc = data.product_desc.split(' ').join('\\ ');

    var line = writeTags(data.order_id, data.product_id, product_desc);

    if (data.compl_qty !== null && data.compl_qty !== undefined) {
      line += 'compl_qty=' + data.compl_qty + ',';
    }
    if (data.machine_state !== null && data.machine_state !== undefined) {
      line += 'machine_state="' + data.machine_state + '"' + ',';
    }
    if (data.scrap_qty !== null && data.scrap_qty !== undefined) {
      line += 'scrap_qty=' + data.scrap_qty + ',';
    }
    if (data.setpoint_rate !== null && data.setpoint_rate !== undefined) {
      line += 'setpoint_rate=' + data.setpoint_rate + ',';
    }

    var startTime = data.scheduled_start_datetime ? data.scheduled_start_datetime : 0;
    var endTime = data.scheduled_end_datetime ? data.scheduled_end_datetime : 0;

    line += 'order_state="' + status + '"' + ',';
    line += 'order_date="' + data.order_date + '"' + ',';
    line += 'planned_changeover_time="' + data.planned_changeover_time + '"' + ',';
    line += 'scheduled_end_datetime=' + endTime + ',';
    line += 'scheduled_start_datetime=' + startTime + ',';
    line += 'production_line="' + data.production_line + '"' + ',';
    line += 'order_qty=' + data.order_qty + ',';
    line += 'planned_rate=' + data.planned_rate;

    //   console.log('writeLineForUpdate');
    //   console.log(line);
    return line;
  }

  _export('writeLineForUpdate', writeLineForUpdate);

  function writeLineForUpdateWithChangingTime(data, currentStatus, startTime, endTime) {
    var product_id = data.product.split(' | ')[0];
    var product_desc = data.product.split(' | ')[1];

    // For influxdb tag keys, must add a forward slash \ before each space
    product_desc = product_desc.split(' ').join('\\ ');

    var line = writeTags(data.orderId, product_id, product_desc);
    line += 'order_state="' + currentStatus + '"' + ',';
    line += 'order_date="' + data.date + '"' + ',';
    line += 'production_line="' + data.productionLine + '"' + ',';
    line += 'planned_changeover_time="' + data.changeover + '"' + ',';
    line += 'scheduled_end_datetime=' + endTime + ',';
    line += 'scheduled_start_datetime=' + startTime + ',';
    line += 'order_qty=' + data.orderQty + ',';
    line += 'setpoint_rate=' + 0 + ',';
    line += 'planned_rate=' + data.plannedRate;

    //   console.log('writeLineForUpdateWithChangingTime');
    //   console.log(line);
    return line;
  }

  /**
   * Prepare a line for influxdb request
   * @param {{}} data Expecting Object : The order data that is to be updated
   * @param {moment} timeDiff Expecting (Moment Duration Object): The time difference that this order is going to add / subtract
   * @param {string} action Expecting String : The action (add / subtract), example -> 'subtract'
   */

  _export('writeLineForUpdateWithChangingTime', writeLineForUpdateWithChangingTime);

  function writeLineForTimeUpdate(data, timeDiff, action) {

    hasTurnedAround = false;
    var roundedTimeDiff = roundTime(timeDiff);

    //if the roundedTimeDiff has been turned around from negative to positive
    //set 'subtract' to add , or 'add' to subtract to also turn the operators around.
    if (action === 'subtract') {
      if (hasTurnedAround) {
        action = 'add';
      }
    } else {
      if (hasTurnedAround) {
        action = 'subtract';
      }
    }

    var endTime = action === 'subtract' ? endTime = moment(data.scheduled_end_datetime).subtract(roundedTimeDiff).valueOf() : endTime = moment(data.scheduled_end_datetime).add(roundedTimeDiff).valueOf();

    var startTime = action === 'subtract' ? startTime = moment(data.scheduled_start_datetime).subtract(roundedTimeDiff).valueOf() : startTime = moment(data.scheduled_start_datetime).add(roundedTimeDiff).valueOf();

    // For influxdb tag keys, must add a forward slash \ before each space
    var product_desc = data.product_desc.split(' ').join('\\ ');

    var line = writeTags(data.order_id, data.product_id, product_desc);

    if (data.compl_qty !== null && data.compl_qty !== undefined) {
      line += 'compl_qty=' + data.compl_qty + ',';
    }
    if (data.machine_state !== null && data.machine_state !== undefined) {
      line += 'machine_state="' + data.machine_state + '"' + ',';
    }
    if (data.scrap_qty !== null && data.scrap_qty !== undefined) {
      line += 'scrap_qty=' + data.scrap_qty + ',';
    }
    if (data.setpoint_rate !== null && data.setpoint_rate !== undefined) {
      line += 'setpoint_rate=' + data.setpoint_rate + ',';
    }

    line += 'order_state="' + data.status + '"' + ',';
    line += 'order_date="' + data.order_date + '"' + ',';
    line += 'planned_changeover_time="' + data.planned_changeover_time + '"' + ',';
    line += 'production_line="' + data.production_line + '"' + ',';
    line += 'order_qty=' + data.order_qty + ',';
    line += 'scheduled_end_datetime=' + endTime + ',';
    line += 'scheduled_start_datetime=' + startTime + ',';
    line += 'planned_rate=' + data.planned_rate;

    //   console.log('writeLineForTimeUpdate');
    //   console.log(line);
    return line;
  }

  _export('writeLineForTimeUpdate', writeLineForTimeUpdate);

  function writeLineForUpdateWithRemovingTime(data, currentStatus) {
    var product_id = data.product.split(' | ')[0];
    var product_desc = data.product.split(' | ')[1];

    // For influxdb tag keys, must add a forward slash \ before each space
    product_desc = product_desc.split(' ').join('\\ ');

    var line = writeTags(data.orderId, product_id, product_desc);
    line += 'order_state="' + currentStatus + '"' + ',';
    line += 'order_date="' + data.date + '"' + ',';
    line += 'production_line="' + data.productionLine + '"' + ',';
    line += 'planned_changeover_time="' + data.changeover + '"' + ',';
    line += 'order_qty=' + data.orderQty + ',';
    line += 'setpoint_rate=' + 0 + ',';
    line += 'planned_rate=' + data.plannedRate;

    //   console.log('writeLineForUpdateWithRemovingTime');
    //   console.log(line);
    return line;
  }

  _export('writeLineForUpdateWithRemovingTime', writeLineForUpdateWithRemovingTime);

  function writeTags(order_id, prod_id, prod_desc) {
    return 'OrderPerformance,order_id=' + order_id + ',product_id=' + prod_id + ',product_desc=' + prod_desc + ' ';
  }

  /**
  * Take a moment duration obj, take this obj's hours mins and seconds to make a new moment duration
  * The purpose is to make a new duration with rounded milsec that is easier for calculation
  * Return the new duration with rounded milsec
  * @param {moment duration obj} timeDiff The moment duration obj
  */
  function roundTime(timeDiff) {
    var timeText = getTimeText(timeDiff);
    return moment.duration(timeText, 'H:mm:ss');
  }

  /**
   * Take a moment duration obj, return a string text of 'h:mm:ss' of the duration
   * If the duration is negative, turn all the negative to positive and set 'hasTurnedAround' to true
   * @param {moment duration obj} time The moment duration obj
   */
  function getTimeText(time) {
    if (time.get('h') < 0 || time.get('minutes') < 0 || time.get('seconds') < 0) {
      hasTurnedAround = true;
    }

    var hour = time.get('h') < 0 ? time.get('h') * -1 : time.get('h');
    var mins = time.get('minutes') < 0 ? time.get('minutes') * -1 : time.get('minutes');
    var seconds = time.get('seconds') < 0 ? time.get('seconds') * -1 : time.get('seconds');

    return hour + ':' + mins + ':' + seconds;
  }
  return {
    setters: [function (_utils) {
      utils = _utils;
    }, function (_moment) {
      moment = _moment.default;
    }],
    execute: function () {
      _export('writeUrl', writeUrl = utils.influxHost + 'write?db=smart_factory');

      _export('writeUrl', writeUrl);

      hasTurnedAround = false;
    }
  };
});
//# sourceMappingURL=influxHelper.js.map
