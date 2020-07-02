import { showOrderEditingForm } from './order_form_ctrl'
import { appEvents } from 'app/core/core'
import * as utils from './utils'
import * as tableCtrl from './table_ctrl'
import * as influx from './influxHelper'
import * as cons from './constants'
import moment from 'moment'

let _rowData
let _allData

const closeForm = () => {
  $('a#order-mgt-scheduler-action-option-close-btn').trigger('click')
}

/**
 * Expect four params which are the tags values and are for querying the record data
 * Show the action options form once the query is finished
 * Remove listener and then add listener, which is to prevent listeners duplication
 * @param {*} productionLine
 * @param {*} orderId
 * @param {*} productDesc
 * @param {*} productId
 */
function showActionOptionsForm (
  productionLine,
  orderId,
  productDesc,
  productId
) {
  // get data
  const tags = {
    prodLine: productionLine,
    orderId: orderId,
    prodDesc: productDesc,
    prodId: productId
  }
  _allData = tableCtrl.allData()
  getRowData(_allData, tags)
    .then(res => {
      init(res)
    })
    .catch(e => {
      utils.alert('error', 'Error', e)
    })
}

function init (res) {
  _rowData = res
  if (
    _rowData.status.toLowerCase() !== cons.STATE_PLAN &&
    _rowData.status.toLowerCase() !== cons.STATE_READY
  ) {
    utils.alert(
      'warning',
      'Warning',
      'This order is ' +
        _rowData.status +
        ' and is no longer available for editing'
    )
    return
  }

  appEvents.emit('show-modal', {
    src:
      'public/plugins/libre-scheduler-order-mgt-table-panel/partials/action_options.html',
    modalClass: 'confirm-modal',
    model: {}
  })

  removeListeners()
  addListeners()
}

/**
 * Use the tags to filter out the clicked order data from all data
 * And return it
 * @param {*} allData All orders
 * @param {*} tags The tags of the order that is clicked
 */
function getRowData (allData, tags) {
  return new Promise((resolve, reject) => {
    const data = allData.filter(
      order =>
        order.production_line === tags.prodLine &&
        order.order_id === tags.orderId &&
        order.product_id === tags.prodId
    )[0]
    if (data.length === 0) {
      reject('Order not found')
    } else {
      const url = `${utils.postgRestHost}order_state`
      utils
        .get(url)
        .then(res => {
          resolve(data)
        })
        .catch(e => {
          reject('error due to order state configuration')
        })
    }
  })
}

/**
 * Add listener for the action selection
 * If edit clicked, go to the edit form with the current record data
 * If realease clicked, change record status to 'Ready'
 * If delete clicked, change record status to 'Deleted'
 */
function addListeners () {
  $(document).on(
    'click',
    'input[type="radio"][name="order-mgt-scheduler-actions-radio"]',
    e => {
      if (e.target.id === 'edit') {
        showOrderEditingForm(_rowData, _allData)
      } else if (e.target.id === 'release') {
        if (_rowData.status.toLowerCase() === cons.STATE_READY) {
          utils.alert('warning', 'Warning', 'Order has already been released')
          closeForm()
        } else {
          updateOrder(cons.STATE_READY)
        }
      } else if (e.target.id === 'delete') {
        updateOrder(cons.STATE_DELETED)
      }
    }
  )
}

/**
 * Remove listener for the action selection
 */
function removeListeners () {
  $(document).off(
    'click',
    'input[type="radio"][name="order-mgt-scheduler-actions-radio"]'
  )
}

/**
 * Expect the action string (Normally are: 'Ready' or 'Deleted')
 * Use the action var passed in to write the line
 * Then update the record
 * Stop and prompt error if it fails
 * @param {*} action
 */
function updateOrder (action) {
  const line = writeInfluxLine(action)
  if (action.toLowerCase() === cons.STATE_DELETED) {
    deleteCurrentAndUpdateAffectOrders(line)
  } else {
    utils
      .post(influx.writeUrl, line)
      .then(res => {
        utils.alert('success', 'Success', 'Order has been marked as ' + action)
        closeForm()
        tableCtrl.refreshDashboard()
      })
      .catch(e => {
        utils.alert(
          'error',
          'Database Error',
          'An error occurred while writing data to the influxdb : ' +
            e +
            'please check the basebase connection'
        )
        closeForm()
      })
  }
}

function deleteCurrentAndUpdateAffectOrders (line) {
  // create promises array and put the 'delete current order request' into it first
  const promises = [utils.post(influx.writeUrl, line)]

  // get all orders data for further filtering
  const allData = tableCtrl.allData()

  // filter affected orders using all orders data
  // affected orders = order.startTime >= thisOrder.endtime && in the same line && with the same date.
  const affectedOrders = allData.filter(
    order =>
      order.scheduled_start_datetime >= _rowData.scheduled_end_datetime &&
      order.production_line === _rowData.production_line &&
      order.order_date === _rowData.order_date
  )

  // work out thisOrder's total duration, which = its duration + its changeover duration
  const deletingOrderDurationHour = moment.duration(
    _rowData.order_qty / (_rowData.planned_rate * 60),
    'hours'
  )
  const deletingOrderChangeover = moment.duration(
    _rowData.planned_changeover_time,
    'H:mm:ss'
  )
  const deletingOrderTotalDur = deletingOrderDurationHour.add(
    deletingOrderChangeover
  )

  // loop affected orders, order's starttime and endtime should both subtract the total duration worked out
  affectedOrders.forEach(order => {
    const line = influx.writeLineForTimeUpdate(
      order,
      deletingOrderTotalDur,
      'subtract'
    )
    promises.push(utils.post(influx.writeUrl, line))
  })

  Promise.all(promises)
    .then(() => {
      utils.alert('success', 'Success', 'Order has been marked as Deleted')
      closeForm()
      tableCtrl.refreshDashboard()
    })
    .catch(e => {
      utils.alert(
        'error',
        'Database Error',
        'An error occurred while deleting the order : ' + e
      )
      closeForm()
    })
}

/**
 * Expect the status string (Normally are: 'Ready' or 'Deleted')
 * Then changed the status in the line with anything else unchanged
 * @param {*} status
 */
function writeInfluxLine (status) {
  // For influxdb tag keys, must add a forward slash \ before each space

  let line = `OrderPerformance,order_id=${_rowData.order_id},product_id=${_rowData.product_id} `

  if (_rowData.compl_qty !== null && _rowData.compl_qty !== undefined) {
    line += 'compl_qty=' + _rowData.compl_qty + ','
  }
  if (_rowData.machine_state !== null && _rowData.machine_state !== undefined) {
    line += 'machine_state="' + getRid(_rowData.machine_state) + '"' + ','
  }
  if (_rowData.scrap_qty !== null && _rowData.scrap_qty !== undefined) {
    line += 'scrap_qty=' + _rowData.scrap_qty + ','
  }
  if (_rowData.setpoint_rate !== null && _rowData.setpoint_rate !== undefined) {
    line += 'setpoint_rate=' + _rowData.setpoint_rate + ','
  }

  if (
    _rowData.scheduled_end_datetime !== null &&
    _rowData.scheduled_end_datetime !== undefined
  ) {
    line += 'scheduled_end_datetime=' + _rowData.scheduled_end_datetime + ','
    line +=
      'scheduled_start_datetime=' + _rowData.scheduled_start_datetime + ','
  }

  line += 'order_state="' + getRid(status) + '"' + ','
  line += 'product_desc="' + getRid(_rowData.product_desc) + '"' + ','
  line += 'order_date="' + _rowData.order_date + '"' + ','
  line +=
    'planned_changeover_time="' + _rowData.planned_changeover_time + '"' + ','
  line += 'production_line="' + getRid(_rowData.production_line) + '"' + ','
  line += 'order_qty=' + _rowData.order_qty + ','
  line += 'planned_rate=' + _rowData.planned_rate

  return line
}

function getRid (x) {
  return x.split('"').join('\\"')
}

export { showActionOptionsForm }
