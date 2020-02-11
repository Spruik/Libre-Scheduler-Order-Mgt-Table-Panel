'use strict';

System.register(['./utils', './constants', 'moment', 'app/core/core', './instant_search_ctrl', './libs/bootstrap-datepicker', './libs/bootstrap-timepicker', './influxHelper', './table_ctrl'], function (_export, _context) {
  "use strict";

  var utils, cons, moment, appEvents, enableInstantSearch, bootstrap_datepicker, bootstrap_timepicker, influx, tableCtrl, closeForm, products, equipment, _rowData, _ordersBeingAffected, _allData, tryCatchCount, _orderDurationHours, _orderStates;

  function _toConsumableArray(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
        arr2[i] = arr[i];
      }

      return arr2;
    } else {
      return Array.from(arr);
    }
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  /**
   * This function is the entry point to show the order editing form
   * It accepts one param, with is called 'data'
   * This 'data' is empty when the user clicks the create icon to create a new order
   * This 'data' is not empty when the user clicks the row to edit the order, and the form will be pre-fill based on the data passed in
   * @param {*} data
   */
  function showOrderEditingForm(data, alldata) {
    _rowData = data;
    _allData = alldata;

    getProductsAndEquipments(callback);

    function callback() {
      appEvents.emit('show-modal', {
        src: 'public/plugins/smart-factory-scheduler-order-mgt-table-panel/partials/order_form.html',
        modalClass: 'confirm-modal',
        model: {}
      });

      tryCatchCount = 1;
      tryCatchCtrl();

      removeListeners();
      addListeners();
    }
  }

  /**
   * Try enable the insatnt search function and the datepicker
   * Re-try if it fails
   * Stop and prompt error if it fails more than 15 times
   */
  function tryCatchCtrl() {
    setTimeout(function () {
      try {
        startCtrl();
      } catch (e) {
        if (tryCatchCount < 15) {
          tryCatchCtrl();
          tryCatchCount++;
        } else {
          $('#order-mgt-scheduler-form-cancelBtn').trigger('click');
          utils.alert('error', 'Error', 'Form initialisation failed, please try agian' + e);
        }
      }
    }, 200);
  }

  /**
   * Enable instant search function and the datepicker
   */
  function startCtrl() {
    enableInstantSearch(products, equipment);
    $('#datepicker').datepicker({
      orientation: 'top',
      todayBtn: 'linked',
      format: 'yyyy-mm-dd',
      autoclose: true
    });

    $('#changeover-minutes-picker').timepicker({
      showMeridian: false,
      showSeconds: true,
      maxHours: 100,
      minuteStep: 1,
      secondStep: 1,
      defaultTime: '00:00:00',
      icons: {
        up: 'fa fa-chevron-up',
        down: 'fa fa-chevron-down'
      }
    });

    prefillData();
  }

  /**
   * Get the product list and production line list from postgresql
   * Call the callback fn passed in once it is finished
   * Stop and prompt error when it fails
   * @param {fn} callback
   */
  function getProductsAndEquipments(callback) {
    var productsUrl = utils.postgRestHost + 'product';
    var equipmentsUrl = utils.postgRestHost + 'equipment?production_line=not.is.null';
    var stateUrl = utils.postgRestHost + 'order_state';

    utils.get(productsUrl).then(function (res) {
      products = res;
      utils.get(equipmentsUrl).then(function (res) {
        equipment = res;
        utils.get(stateUrl).then(function (res) {
          _orderStates = res;
          callback();
        }).catch(function (e) {
          utils.alert('error', 'Error', 'An error occurred while fetching data from the postgresql : ' + e + 'please check the basebase connection');
        });
      }).catch(function (e) {
        utils.alert('error', 'Error', 'An error occurred while fetching data from the postgresql : ' + e + 'please check the basebase connection');
      });
    }).catch(function (e) {
      utils.alert('error', 'Error', 'An error occurred while fetching data from the postgresql : ' + e + 'please check the basebase connection');
    });
  }

  /**
   * Pre-fiil the information when it comes with data (When the user clicks the row)
   */
  function prefillData() {
    if (_rowData) {
      $('input.ord-mgt-datalist-input#order-id').val(_rowData.order_id);
      $('input.ord-mgt-datalist-input#order-qty').val(_rowData.order_qty);
      $('input.ord-mgt-datalist-input#datalist-input-production-line').val(_rowData.production_line);
      $('input.ord-mgt-datalist-input#datalist-input-products').val(_rowData.product_id + ' | ' + _rowData.product_desc);
      $('input.ord-mgt-datalist-input#datepicker').val(_rowData.order_date);
      $('input.ord-mgt-datalist-input#planned-rate').val(_rowData.planned_rate);
      $('input.ord-mgt-datalist-input#changeover-minutes-picker').val(_rowData.planned_changeover_time);
      updateDuration(_rowData.order_qty, _rowData.planned_rate);
    }
  }

  /**
   * Add click event listener for the submit btn
   */
  function addListeners() {
    $(document).on('click', 'button#order-mgt-scheduler-form-submitBtn', function (e) {
      var data = $('form#order-mgt-scheduler-form').serializeArray();
      submitOrder(data);
    });

    $(document).on('input', 'input#planned-rate, input#order-qty', function (e) {
      var data = $('form#order-mgt-scheduler-form').serializeArray();
      updateDuration(data[1].value, data[5].value);
    });
  }

  /**
   * Remove the click event listner for the submit btn
   */
  function removeListeners() {
    $(document).off('click', 'button#order-mgt-scheduler-form-submitBtn');
    $(document).off('input', 'input#planned-rate, input#order-qty');
  }

  function updateDuration(qty, rate) {
    if (qty !== '' && rate !== '') {
      var durationHrs = Number(parseFloat(qty).toFixed(2)) / Number((parseFloat(rate) * 60).toFixed(2));
      var momentDuration = moment.duration(durationHrs, 'hours');

      var durationText = getDurationText(momentDuration);

      $('input.ord-mgt-datalist-input#duration').val(durationText);
    } else {
      $('input.ord-mgt-datalist-input#duration').val('');
    }
  }

  function getDurationText(momentDuration) {
    var month = momentDuration.get('month');
    var days = momentDuration.get('d');
    var hrs = momentDuration.get('h');
    var mins = momentDuration.get('minute');
    var text = 'under 1 minute';

    if (month > 0) {
      return 'Over a month!';
    }

    if (days !== 0) {
      hrs += days * 24;
    }

    if (hrs !== 0 && mins !== 0) {
      text = hrs + ' hour(s) & ' + mins + ' minute(s)';
    } else if (hrs !== 0 && mins === 0) {
      text = hrs + ' hour(s)';
    } else if (hrs === 0 && mins !== 0) {
      text = mins + ' minute(s)';
    }

    return text;
  }

  /**
   * Expect the form data and then check if the form data is valid
   * If data is valid, check if the tags are changed, simply update the record if tags are unchanged
   * Or create a new record with the validated form data then update the old record's status as 'Replaced'
   * @param {*} data
   */
  function submitOrder(data) {
    var inputValues = _defineProperty({
      orderId: data[0].value,
      orderQty: data[1].value,
      productionLine: data[2].value,
      product: data[3].value,
      date: data[4].value,
      plannedRate: data[5].value,
      duration: data[6].value,
      changeover: data[7].value,
      scheduled_end_datetime: _rowData.scheduled_start_datetime
    }, 'scheduled_end_datetime', _rowData.scheduled_end_datetime);

    if (isValueValid(inputValues)) {
      updateOrder(inputValues);
    }
  }

  function updateOrder(inputValues) {
    console.log('in update order');
    //the orders that are in the original line that this order was in and that are being affected because this order changes line
    var ordersBeingAffected = getOrdersBeingAffect(_allData, inputValues);
    _ordersBeingAffected = ordersBeingAffected;
    console.log('_ordersBeingAffected', _ordersBeingAffected);

    if (!isLineHavingSpareTimeForTheDay(_allData, inputValues, _rowData)) {
      utils.alert('warning', 'Warning', "There is no spare space for this order to fit in this date's schedule");
      return;
    }

    // if (hasTagsChanged(inputValues)) {
    updateOldAndNewOrders(inputValues);
    // }else {
    //   //in here, check if the line has changed, if yes, meaning that the order is going to another line
    //   //so also update all affectingOrders(orders that are in the original line and that are after this order)
    //   if (isLineChanged(inputValues)) {
    //     //save the order directly with removing its starttime and endtime to let the initialiser to init it again
    //     //coz it is changing line, so just simply remove the start time and end time
    //     updateWithRemoving(inputValues)
    //   }else{
    //     //save the order directly with changing its starttime and endtime
    //     if (isDateChanged(inputValues)) {
    //       updateWithRemoving(inputValues)
    //     }else{
    //       updateWithChanging(inputValues)
    //     }
    //   }
    // }
  }

  function updateOldAndNewOrders(inputValues) {
    if (_rowData) {
      console.log('in edit order-');
      var line = influx.writeLineForUpdate(cons.STATE_REPLACED, _rowData);
      utils.post(influx.writeUrl, line).then(function (res) {
        //save the new order directly with removing its starttime and endtime to let the initialiser to init it again
        //becuase this is the first
        if (isLineChanged(inputValues)) {
          updateWithRemoving(inputValues);
        } else {
          if (isDateChanged(inputValues)) {
            updateWithRemoving(inputValues);
          } else {
            updateWithChanging(inputValues);
          }
        }
      }).catch(function (e) {
        closeForm();
        utils.alert('error', 'Error', 'An error occurred when updated the order : ' + e);
      });
    } else {
      console.log('in new order');
      //if there is no _rowdata, meaning that it is being created, so no need to update
      if (isLineChanged(inputValues)) {
        updateWithRemoving(inputValues);
      } else {
        if (isDateChanged(inputValues)) {
          updateWithRemoving(inputValues);
        } else {
          updateWithChanging(inputValues);
        }
      }
    }
  }

  function isDateChanged(inputValues) {
    return _rowData.order_date !== inputValues.date;
  }

  /**
   * Take the user input, send request to change the current order to be what the user has entered in the edition form
   * It normally changes the current order's starttime and endtime because the order is being changed
   * @param {*} inputValues User input
   */
  function updateWithChanging(inputValues) {
    console.log('in updateWithChanging');
    var originalStartTime = _rowData.scheduled_start_datetime;
    //The difference between the original changeover and the edited changeover
    var changeoverDiff = moment.duration(inputValues.changeover).subtract(moment.duration(_rowData.planned_changeover_time));
    var startTime = moment(originalStartTime).add(changeoverDiff);
    var duration = moment.duration(inputValues.orderQty / (inputValues.plannedRate * 60), 'hours');
    var endTime = moment(originalStartTime).add(changeoverDiff).add(duration);

    //calc the difference between the edited order's total duration and the original order's total duration
    //so that all the affected orders know how many to add/subtract
    var oldTotal = moment.duration(_rowData.order_qty / (_rowData.planned_rate * 60), 'hours').add(moment.duration(_rowData.planned_changeover_time));

    var newTotal = duration.add(moment.duration(inputValues.changeover));
    var difference = oldTotal.subtract(newTotal);
    console.log('dif', difference);

    var line = influx.writeLineForUpdateWithChangingTime(inputValues, _rowData.status, startTime.valueOf(), endTime.valueOf());
    utils.post(influx.writeUrl, line).then(function (res) {
      updateAffectedOrders(inputValues, difference);
    }).catch(function (e) {
      closeForm();
      utils.alert('error', 'Error', 'An error occurred when updated the order : ' + e);
    });
  }

  function getInitState() {
    return _orderStates.filter(function (x) {
      return x.is_init_state;
    })[0].state;
  }

  /**
   * Take the user input, send request to change the current order to be what the user has entered in the edition form
   * It will remove the order's start time and end time because it is changing line so that no order will be affected in the changing line
   * and so that the start time and end time can be removed, and then let the initialiser to init the time again.
   * @param {*} inputValues The user input
   */
  function updateWithRemoving(inputValues) {
    console.log('in updateWithRemoving');
    var initState = getInitState();
    if (!initState) {
      utils.alert('error', 'Error', 'Cannot find Initial State from the Order State Config Table');
      return;
    }
    var line = influx.writeLineForUpdateWithRemovingTime(inputValues, _rowData ? _rowData.status : initState);

    utils.post(influx.writeUrl, line).then(function (res) {
      if (_ordersBeingAffected.length > 0) {
        console.log('starting to get dif and then update');
        var difference = getDiff(inputValues);
        console.log('dif after get dif', difference);
        updateAffectedOrders(inputValues, difference);
      } else {
        closeForm();
        utils.alert('success', 'Successful', 'Order has been successfully updated');
        tableCtrl.refreshDashboard();
      }
    }).catch(function (e) {
      closeForm();
      utils.alert('error', 'Error', 'An error occurred when updated the order : ' + e);
    });
  }

  /**
   * Take the time difference, send request to add/subtract the time diff for all the affected orders due to -
   * the edited order being changed or removed from the current line and date
   * @param {*} inputValues The user input
   * @param {*} difference The time difference that all affected orders will need to add/subtract
   */
  function updateAffectedOrders(inputValues, difference) {
    console.log('in updateAffectedOrders');
    var promises = [];
    _ordersBeingAffected.forEach(function (order) {
      console.log('in updating single order', order);
      var line = influx.writeLineForTimeUpdate(order, difference, 'subtract');
      var prom = utils.post(influx.writeUrl, line);
      promises.push(prom);
    });
    Promise.all(promises).then(function (res) {
      closeForm();
      utils.alert('success', 'Successful', 'Order has been successfully updated');
      tableCtrl.refreshDashboard();
    }).catch(function (e) {
      closeForm();
      utils.alert('error', 'Error', 'An error occurred when updated the order : ' + e);
    });
  }

  /**
   * Take inputValues and find the qty and rate to calc the duration
   * then return duration + changeover duration
   * @param {*} inputValues User input for the form
   */
  function getDiff(inputValues) {
    var diff = void 0;
    var duration = moment.duration(inputValues.orderQty / (inputValues.plannedRate * 60), 'hours');
    var changeover = moment.duration(inputValues.changeover, 'H:mm:ss');
    diff = duration.add(changeover);
    return diff;
  }

  function isLineHavingSpareTimeForTheDay(allData, inputValues, rowData) {
    console.log('in isLineHavingSpareTimeForTheDay');
    //all orders in the targeting line (except the editing order itself (if line not changed))
    var affectedOrders = allData.filter(function (order) {
      return order.production_line === inputValues.productionLine && order.order_date === inputValues.date;
    });
    affectedOrders = affectedOrders.filter(function (order) {
      return order.order_id !== rowData.order_id;
    });

    //find the line's default start time and then plus next day
    var targetDayStartTime = moment(moment(inputValues.date, 'YYYY-MM-DD').format('YYYY-MM-DD') + ' ' + utils.getLineStartTime(rowData.production_line), 'YYYY-MM-DD H:mm:ss');
    var targetDayStartTimeText = targetDayStartTime.format('YYYY-MM-DD H:mm:ss');
    var nextDayStartTime = moment(targetDayStartTimeText, 'YYYY-MM-DD H:mm:ss').add(1, 'days');

    //calc edited order's duration
    var duration = moment.duration(inputValues.orderQty / (inputValues.plannedRate * 60), 'hours');
    var changeover = moment.duration(inputValues.changeover, 'H:mm:ss');
    var totalDur = duration.add(changeover);

    //if no affected orders, see if target dat start time + totaldur <= nextdatstarttime
    if (affectedOrders.length === 0) {
      return targetDayStartTime.add(totalDur).isSameOrBefore(nextDayStartTime);
    }

    //get the max end time
    var all_end_times = affectedOrders.map(function (order) {
      return order.scheduled_end_datetime;
    });
    var maxEndTime = moment(Math.max.apply(Math, _toConsumableArray(all_end_times)));
    maxEndTime.add(totalDur);

    return maxEndTime.isSameOrBefore(nextDayStartTime);
  }

  /**
   * get alldata and the user input to filter all affected orders.
   * These orders will be the ones that are in the original line with the same date.
   * @param {*} allData All the orders that is being passed in and displayed in this panel
   * @param {*} inputValues Inputs that the user entered in this order edition form
   */
  function getOrdersBeingAffect(allData, inputValues) {
    var ordersInOriginalLineAndDate = allData.filter(function (order) {
      return order.production_line === _rowData.production_line && order.order_date === _rowData.order_date;
    });
    return ordersInOriginalLineAndDate.filter(function (order) {
      var endTime = moment(inputValues.scheduled_end_datetime);
      return order.scheduled_start_datetime >= endTime.valueOf() && order.order_date === _rowData.order_date;
    });
  }

  /**
   * Expect the user inputs
   * Compare the user inputs and the globe scope var called 'rowData'
   * Check if the user inputs is different from the rowData to determine if the Tags are changed
   * @param {*} inputs
   */
  function hasTagsChanged(inputs) {
    if (!_rowData) {
      //if there is no rowData, meaning that the user is creating a new order, so return false
      return false;
    }
    var product_id = inputs.product.split(' | ')[0];
    var product_desc = inputs.product.split(' | ')[1];
    return inputs.orderId !== _rowData.order_id || product_id !== _rowData.product_id || product_desc !== _rowData.product_desc;
  }

  /**
   * Compares the user input and the original order to see if the line has been changed.
   * return true if it is.
   * @param {*} inputValues The user input
   */
  function isLineChanged(inputValues) {
    return inputValues.productionLine !== _rowData.production_line;
  }

  /**
   * Expect the user inputs
   * Check if the user inputs are valid
   * Stop and prompt error if the inputs are not valid
   * @param {*} data
   */
  function isValueValid(data) {
    var dateRegExp = new RegExp('^[0-9]{4}-(((0[13578]|(10|12))-(0[1-9]|[1-2][0-9]|3[0-1]))|(02-(0[1-9]|[1-2][0-9]))|((0[469]|11)-(0[1-9]|[1-2][0-9]|30)))$');
    var prodList = products.reduce(function (arr, p) {
      var str = p.id + ' | ' + p.product_desc;
      arr.push(str);
      return arr;
    }, []);

    var productionLineList = equipment.reduce(function (arr, equ) {
      arr.push(equ.site + ' | ' + equ.area + ' | ' + equ.production_line);
      return arr;
    }, []);
    productionLineList = utils.distinctElems(productionLineList);

    if (data.orderId === '') {
      utils.alert('warning', 'Warning', 'Order Number Empty, please enter the Order Number');
      return false;
    }

    if (data.orderQty === '') {
      utils.alert('warning', 'Warning', 'Order Quantity Empty, please enter the Order Quantity');
      return false;
    }

    if (data.productionLine === '') {
      utils.alert('warning', 'Warning', 'Production Line Empty, please enter the Production Line');
      return false;
    } else {
      if (productionLineList.indexOf(data.productionLine) === -1) {
        utils.alert('warning', 'Warning', 'Production Line Not Exist, please select a Production Line from the Production Line List');
        return false;
      }
    }

    if (data.product === '') {
      utils.alert('warning', 'Warning', 'Product Empty, please enter the Product');
      return false;
    } else {
      if (prodList.indexOf(data.product) === -1) {
        utils.alert('warning', 'Warning', 'Product Not Exist, please select a Product from the Product List');
        return false;
      }
    }

    if (!dateRegExp.test(data.date)) {
      utils.alert('warning', 'Warning', 'Scheduled Start Date Empty or Invalid Date Format, please choose a date from the date picker');
      return false;
    }

    if (data.plannedRate === '') {
      utils.alert('warning', 'Warning', 'Planned Rate Empty, please enter the Planned Rate');
      return false;
    }

    return true;
  }

  return {
    setters: [function (_utils) {
      utils = _utils;
    }, function (_constants) {
      cons = _constants;
    }, function (_moment) {
      moment = _moment.default;
    }, function (_appCoreCore) {
      appEvents = _appCoreCore.appEvents;
    }, function (_instant_search_ctrl) {
      enableInstantSearch = _instant_search_ctrl.enableInstantSearch;
    }, function (_libsBootstrapDatepicker) {
      bootstrap_datepicker = _libsBootstrapDatepicker;
    }, function (_libsBootstrapTimepicker) {
      bootstrap_timepicker = _libsBootstrapTimepicker;
    }, function (_influxHelper) {
      influx = _influxHelper;
    }, function (_table_ctrl) {
      tableCtrl = _table_ctrl;
    }],
    execute: function () {
      closeForm = function closeForm() {
        return $('#order-mgt-scheduler-form-close-btn').trigger('click');
      };

      products = void 0;
      equipment = void 0;
      _rowData = void 0;
      _ordersBeingAffected = void 0;
      _allData = void 0;
      tryCatchCount = 1;
      _orderDurationHours = void 0;
      _orderStates = void 0;

      _export('showOrderEditingForm', showOrderEditingForm);
    }
  };
});
//# sourceMappingURL=order_form_ctrl.js.map
