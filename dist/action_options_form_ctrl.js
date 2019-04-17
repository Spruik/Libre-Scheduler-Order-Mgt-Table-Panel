'use strict';

System.register(['./order_form_ctrl', 'app/core/core', './utils', './table_ctrl', './influxHelper', 'moment'], function (_export, _context) {
  "use strict";

  var showOrderEditingForm, appEvents, utils, tableCtrl, influx, moment, _rowData, _allData, closeForm;

  /**
   * Expect four params which are the tags values and are for querying the record data
   * Show the action options form once the query is finished
   * Remove listener and then add listener, which is to prevent listeners duplication
   * @param {*} productionLine 
   * @param {*} orderId 
   * @param {*} productDesc 
   * @param {*} productId 
   */
  function showActionOptionsForm(productionLine, orderId, productDesc, productId) {
    //get data
    var tags = { prodLine: productionLine, orderId: orderId, prodDesc: productDesc, prodId: productId };
    _allData = tableCtrl.allData();
    console.log('before getrowdata, alldata');
    console.log(_allData);
    getRowData(_allData, tags).then(function (res) {
      init(res);
    }).catch(function (e) {
      utils.alert('error', 'Error', e);
    });
  }

  function init(res) {
    _rowData = res;
    console.log('after getrowdata, data');
    console.log(_rowData);
    if (_rowData.status.toLowerCase() !== 'planned' && _rowData.status.toLowerCase() !== 'ready') {
      utils.alert('warning', 'Warning', 'This order is ' + _rowData.status + ' and is no longer available for editing');
      return;
    }

    appEvents.emit('show-modal', {
      src: 'public/plugins/smart-factory-scheduler-order-mgt-table-panel/partials/action_options.html',
      modalClass: 'confirm-modal',
      model: {}
    });

    removeListeners();
    addListeners();
  }

  /**
   * Use the tags to filter out the clicked order data from all data
   * And return it
   * @param {*} allData All orders
   * @param {*} tags The tags of the order that is clicked
   */
  function getRowData(allData, tags) {
    return new Promise(function (resolve, reject) {
      var data = allData.filter(function (order) {
        return order.production_line === tags.prodLine && order.order_id === tags.orderId && order.product_id === tags.prodId;
      })[0];
      if (data.length === 0) {
        reject('Order not found');
      } else {
        resolve(data);
      }
    });
  }

  /**
   * Add listener for the action selection
   * If edit clicked, go to the edit form with the current record data
   * If realease clicked, change record status to 'Ready'
   * If delete clicked, change record status to 'Deleted'
   */
  function addListeners() {
    $(document).on('click', 'input[type="radio"][name="order-mgt-scheduler-actions-radio"]', function (e) {

      if (e.target.id === 'edit') {
        showOrderEditingForm(_rowData, _allData);
      } else if (e.target.id === 'release') {
        if (_rowData.status === 'Ready') {
          utils.alert('warning', 'Warning', 'Order has already been released');
          closeForm();
        } else {
          updateOrder('Ready');
        }
      } else if (e.target.id === 'delete') {
        updateOrder('Deleted');
      }
    });
  }

  /**
   * Remove listener for the action selection
   */
  function removeListeners() {
    $(document).off('click', 'input[type="radio"][name="order-mgt-scheduler-actions-radio"]');
  }

  /**
   * Expect the action string (Normally are: 'Ready' or 'Deleted')
   * Use the action var passed in to write the line
   * Then update the record
   * Stop and prompt error if it fails
   * @param {*} action 
   */
  function updateOrder(action) {
    var line = writeInfluxLine(action);
    if (action === 'Deleted') {
      deleteCurrentAndUpdateAffectOrders(line);
    } else {
      utils.post(influx.writeUrl, line).then(function (res) {
        utils.alert('success', 'Success', 'Order has been marked as ' + action);
        closeForm();
        tableCtrl.refreshDashboard();
      }).catch(function (e) {
        utils.alert('error', 'Database Error', 'An error occurred while writing data to the influxdb : ' + e + 'please check the basebase connection');
        closeForm();
      });
    }
  }

  function deleteCurrentAndUpdateAffectOrders(line) {
    //create promises array and put the 'delete current order request' into it first
    var promises = [utils.post(influx.writeUrl, line)];

    //get all orders data for further filtering
    var allData = tableCtrl.allData();

    //filter affected orders using all orders data
    //affected orders = order.startTime >= thisOrder.endtime && in the same line && with the same date.
    var affectedOrders = allData.filter(function (order) {
      return order.scheduled_start_datetime >= _rowData.scheduled_end_datetime && order.production_line === _rowData.production_line && order.order_date === _rowData.order_date;
    });

    //work out thisOrder's total duration, which = its duration + its changeover duration
    var deletingOrderDurationHour = moment.duration(_rowData.order_qty / _rowData.planned_rate, 'hours');
    var deletingOrderChangeover = moment.duration(_rowData.planned_changeover_time, 'H:mm:ss');
    var deletingOrderTotalDur = deletingOrderDurationHour.add(deletingOrderChangeover);

    //loop affected orders, order's starttime and endtime should both subtract the total duration worked out
    affectedOrders.forEach(function (order) {
      var line = influx.writeLineForTimeUpdate(order, deletingOrderTotalDur, 'subtract');
      promises.push(utils.post(influx.writeUrl, line));
    });

    Promise.all(promises).then(function () {
      utils.alert('success', 'Success', 'Order has been marked as Deleted');
      closeForm();
      tableCtrl.refreshDashboard();
    }).catch(function (e) {
      utils.alert('error', 'Database Error', 'An error occurred while deleting the order : ' + e);
      closeForm();
    });
  }

  /**
   * Expect the status string (Normally are: 'Ready' or 'Deleted')
   * Then changed the status in the line with anything else unchanged
   * @param {*} status 
   */
  function writeInfluxLine(status) {
    //For influxdb tag keys, must add a forward slash \ before each space 
    var product_desc = _rowData.product_desc.split(' ').join('\\ ');

    var line = 'OrderPerformance,order_id=' + _rowData.order_id + ',product_id=' + _rowData.product_id + ',product_desc=' + product_desc + ' ';

    if (_rowData.compl_qty !== null && _rowData.compl_qty !== undefined) {
      line += 'compl_qty=' + _rowData.compl_qty + ',';
    }
    if (_rowData.machine_state !== null && _rowData.machine_state !== undefined) {
      line += 'machine_state="' + _rowData.machine_state + '"' + ',';
    }
    if (_rowData.scrap_qty !== null && _rowData.scrap_qty !== undefined) {
      line += 'scrap_qty=' + _rowData.scrap_qty + ',';
    }
    if (_rowData.setpoint_rate !== null && _rowData.setpoint_rate !== undefined) {
      line += 'setpoint_rate=' + _rowData.setpoint_rate + ',';
    }

    if (_rowData.scheduled_end_datetime !== null && _rowData.scheduled_end_datetime !== undefined) {
      line += 'scheduled_end_datetime=' + _rowData.scheduled_end_datetime + ',';
      line += 'scheduled_start_datetime=' + _rowData.scheduled_start_datetime + ',';
    }

    line += 'order_state="' + status + '"' + ',';
    line += 'order_date="' + _rowData.order_date + '"' + ',';
    line += 'planned_changeover_time="' + _rowData.planned_changeover_time + '"' + ',';
    line += 'production_line="' + _rowData.production_line + '"' + ',';
    line += 'order_qty=' + _rowData.order_qty + ',';
    line += 'planned_rate=' + _rowData.planned_rate;

    //   console.log('writeInfluxLine');
    //   console.log(line);
    return line;
  }

  return {
    setters: [function (_order_form_ctrl) {
      showOrderEditingForm = _order_form_ctrl.showOrderEditingForm;
    }, function (_appCoreCore) {
      appEvents = _appCoreCore.appEvents;
    }, function (_utils) {
      utils = _utils;
    }, function (_table_ctrl) {
      tableCtrl = _table_ctrl;
    }, function (_influxHelper) {
      influx = _influxHelper;
    }, function (_moment) {
      moment = _moment.default;
    }],
    execute: function () {
      _rowData = void 0;
      _allData = void 0;

      closeForm = function closeForm() {
        $('a#order-mgt-scheduler-action-option-close-btn').trigger('click');
      };

      _export('showActionOptionsForm', showActionOptionsForm);
    }
  };
});
//# sourceMappingURL=action_options_form_ctrl.js.map
