import * as utils from './utils'
import moment from 'moment'
import { appEvents } from 'app/core/core'
import { enableInstantSearch } from './instant_search_ctrl'
import  * as bootstrap_datepicker  from './libs/bootstrap-datepicker'

let products
let equipment
let rowData
let tryCatchCount = 1
let _orderDurationHours

/**
 * This function is the entry point to show the order editing form
 * It accepts one param, with is called 'data'
 * This 'data' is empty when the user clicks the create icon to create a new order
 * This 'data' is not empty when the user clicks the row to edit the order, and the form will be pre-fill based on the data passed in
 * @param {*} data
 */
function showOrderEditingForm (data) {

  rowData = data
  
  getProductsAndEquipments(callback)

  function callback () {

    appEvents.emit('show-modal', {
        src: 'public/plugins/smart-factory-scheduler-order-mgt-table-panel/partials/order_form.html',
        modalClass: 'confirm-modal',
        model: {}
    })

    tryCatchCount = 1
    tryCatchCtrl()

    removeListeners()
    addListeners()
  }
}

/**
 * Try enable the insatnt search function and the datepicker
 * Re-try if it fails
 * Stop and prompt error if it fails more than 15 times
 */
function tryCatchCtrl(){
  setTimeout(() => {
    try {
      startCtrl()
    } catch (e) {
      if (tryCatchCount < 15) {
        tryCatchCtrl()
        console.log('Re-init: ' + tryCatchCount);
        tryCatchCount ++
      }else {
        console.log(e)
        $('#order-mgt-scheduler-form-cancelBtn').trigger('click')
        utils.alert('error', 'Error', 'Form initialisation failed, please try agian')
      }
    }
  }, 200);
}

/**
 * Enable instant search function and the datepicker
 */
function startCtrl(){
  enableInstantSearch(products, equipment)
  $('#datepicker').datepicker({
      orientation: 'top',
      todayBtn: 'linked',
      format: 'yyyy-mm-dd',
      autoclose: true,
  })

  prefillData()
}

/**
 * Get the product list and production line list from postgresql
 * Call the callback fn passed in once it is finished
 * Stop and prompt error when it fails
 * @param {fn} callback 
 */
function getProductsAndEquipments (callback) {
  let productsUrl = utils.postgRestHost + 'products'
  let equipmentsUrl = utils.postgRestHost + 'equipment?production_line=not.is.null'

  utils.get(productsUrl)
    .then(res => {
      products = res
      utils.get(equipmentsUrl)
        .then(res => {
          equipment = res
          callback()
        })
        .catch(e => {
          console.log(e)
          utils.alert('error', 'Error', 'An error occurred while fetching data from the postgresql, please check the basebase connection')
        })
    })
    .catch(e => {
      console.log(e)
      utils.alert('error', 'Error', 'An error occurred while fetching data from the postgresql, please check the basebase connection')
    })
}

/**
 * Pre-fiil the information when it comes with data (When the user clicks the row)
 */
function prefillData(){
  if (rowData) {
    // console.log('need to pre-fill')
    $('input.ord-mgt-datalist-input#order-id').val(rowData.order_id)
    $('input.ord-mgt-datalist-input#order-qty').val(rowData.order_qty)
    $('input.ord-mgt-datalist-input#datalist-input-production-line').val(rowData.production_line)
    $('input.ord-mgt-datalist-input#datalist-input-products').val(rowData.product_id + ' | ' + rowData.product_desc)
    $('input.ord-mgt-datalist-input#datepicker').val(rowData.order_date)
    $('input.ord-mgt-datalist-input#planned-rate').val(rowData.planned_rate)
    updateDuration(rowData.order_qty, rowData.planned_rate)
  }
}

/**
 * Add click event listener for the submit btn
 */
function addListeners(){
  $(document).on('click', 'button#order-mgt-scheduler-form-submitBtn', e => {
    let data = $('form#order-mgt-scheduler-form').serializeArray()
    submitOrder(data)
  })

  $(document).on('input', 'input#planned-rate, input#order-qty', e => {
    let data = $('form#order-mgt-scheduler-form').serializeArray()
    updateDuration(data[1].value, data[5].value)
  })
}

/**
 * Remove the click event listner for the submit btn
 */
function removeListeners(){
  $(document).off('click', 'button#order-mgt-scheduler-form-submitBtn')
  $(document).off('input', 'input#planned-rate, input#order-qty')
}

function updateDuration(qty, rate){

  if (qty !== "" && rate !== "") {
    let durationHrs = parseInt(qty) / parseInt(rate)
    let momentDuration = moment.duration(durationHrs, 'hours')

    let durationText = getDurationText(momentDuration)
    
    $('input.ord-mgt-datalist-input#duration').val(durationText)
  }else {
    $('input.ord-mgt-datalist-input#duration').val('')
  }
}

function getDurationText(momentDuration) {
  let month = momentDuration.get('month')
  let days = momentDuration.get('d')
  let hrs = momentDuration.get('h')
  let mins = momentDuration.get('minute')
  let text = ''

  if (month > 0) {return 'Over a month!'}

  if (days !== 0) { hrs += days * 24 }

  if (hrs !== 0 && mins !== 0) {
    text = hrs + ' hour(s) & ' + mins + ' minute(s)'
  }else if (hrs !== 0 && mins === 0){
    text = hrs + ' hour(s)'
  }else if (hrs === 0 && mins !== 0){
    text = min + ' minute(s)'
  }
  
  return text
}

/**
 * Expect the form data and then check if the form data is valid
 * If data is valid, check if the tags are changed, simply update the record if tags are unchanged
 * Or create a new record with the validated form data then update the old record's status as 'Replaced'
 * @param {*} data 
 */
function submitOrder(data) {
  
  const inputValues = {
    orderId: data[0].value, 
    orderQty: data[1].value, 
    productionLine: data[2].value, 
    product: data[3].value, 
    date: data[4].value, 
    plannedRate: data[5].value,
    duration: data[6].value
  }

  if (isValueValid(inputValues)) {
    const url = utils.influxHost + 'write?db=smart_factory'
    if (hasTagsChanged(inputValues)) {
      updateWithTagsChanged(url, inputValues)
    }else {
      updateWithTagsUnchanged(url, inputValues)
    }
  }

}

/**
 * Send Post request to write the influxdb with the url passed in and the line later created
 * Create a new record with the validated input
 * Update the old record as 'Replaced'
 * Stop and prompt error when it fails
 * @param {*} url 
 * @param {*} input 
 */
function updateWithTagsChanged(url, input){

  const newLine = writeInfluxLine(input)
  const oldLine = writeOldInfluxLine()
  utils.post(url, newLine).then(() => {
    utils.post(url, oldLine).then(() => {
      utils.alert('success', 'Success', 'Order has been successfully updated')
      $('#order-mgt-scheduler-form-cancelBtn').trigger('click')
    }).catch(error => {
      console.log(error)
      utils.alert('error', 'Database Error', 'An error occurred while updating data to the influxdb, please check the basebase connection')
      $('#order-mgt-scheduler-form-cancelBtn').trigger('click')
    })
  }).catch(error => {
      console.log(error)
      utils.alert('error', 'Database Error', 'An error occurred while updating data to the influxdb, please check the basebase connection')
      $('#order-mgt-scheduler-form-cancelBtn').trigger('click')
  })

}

/**
 * Send Post request to write the influxdb with the url passed in and the line later created
 * Simply update the record
 * Stop and prompt error when it fails
 * @param {*} url 
 * @param {*} input 
 */
function updateWithTagsUnchanged(url, input){

  const line = writeInfluxLine(input)
  utils.post(url, line).then(res => {
    utils.alert('success', 'Success', (rowData !== '' && rowData !== undefined) ? 'Order has been successfully updated' : 'Order has been successfully created')
    $('#order-mgt-scheduler-form-cancelBtn').trigger('click')
  }).catch(e => {
    console.log(e)
    utils.alert('error', 'Database Error', 'An error occurred while updating data to the influxdb, please check the basebase connection')
    $('#order-mgt-scheduler-form-cancelBtn').trigger('click')
  })

}

/**
 * Expect the user inputs
 * Compare the user inputs and the globe scope var called 'rowData'
 * Check if the user inputs is different from the rowData to determine if the Tags are changed
 * @param {*} inputs 
 */
function hasTagsChanged(inputs) {
  
  if (!rowData) {
    //if there is no rowData, meaning that the user is creating a new order, so return false
    return false
  }
  const product_id = inputs.product.split(' | ')[0]
  const product_desc = inputs.product.split(' | ')[1]
  return (
    inputs.orderId !== rowData.order_id 
    || product_id !== rowData.product_id 
    || product_desc !== rowData.product_desc
  )
}

/**
 * Expect the user inputs
 * Check if the user inputs are valid
 * Stop and prompt error if the inputs are not valid
 * @param {*} data 
 */
function isValueValid(data) {

  const dateRegExp = new RegExp('^[0-9]{4}-(((0[13578]|(10|12))-(0[1-9]|[1-2][0-9]|3[0-1]))|(02-(0[1-9]|[1-2][0-9]))|((0[469]|11)-(0[1-9]|[1-2][0-9]|30)))$')
  const prodList = products.reduce((arr, p) => {
    const str = p.product_id + ' | ' + p.product_desc
    arr.push(str)
    return arr
  }, [])

  let productionLineList = equipment.reduce((arr, equ) => {
    arr.push(equ.site + ' | ' + equ.area + ' | ' + equ.production_line)
    return arr
  }, [])  
  productionLineList = utils.distinctElems(productionLineList)

  if (data.orderId === '') {
    utils.alert('warning', 'Warning', 'Order Number Empty, please enter the Order Number')
    return false
  }

  if (data.orderQty === '') {
    utils.alert('warning', 'Warning', 'Order Quantity Empty, please enter the Order Quantity')
    return false
  }

  if (data.productionLine === '') {
    utils.alert('warning', 'Warning', 'Production Line Empty, please enter the Production Line')
    return false
  }else {
    if (productionLineList.indexOf(data.productionLine) === -1) {
      utils.alert('warning', 'Warning', 'Production Line Not Exist, please select a Production Line from the Production Line List')
      return false
    }
  }

  if (data.product === '') {
    utils.alert('warning', 'Warning', 'Product Empty, please enter the Product')
    return false
  }else {
    if (prodList.indexOf(data.product) === -1) {
      utils.alert('warning', 'Warning', 'Product Not Exist, please select a Product from the Product List')
      return false
    }
  }

  if (!dateRegExp.test(data.date)) {
    utils.alert('warning', 'Warning', 'Scheduled Start Date Empty or Invalid Date Format, please choose a date from the date picker')
    return false
  }

  if (data.plannedRate === '') {
    utils.alert('warning', 'Warning', 'Planned Rate Empty, please enter the Planned Rate')
    return false
  }

  return true
}

/**
 * Expect the validated user inputs
 * Write line to update the record with the user inputs passed in
 * @param {*} data 
 */
function writeInfluxLine (data) {
  const product_id = data.product.split(' | ')[0]
  let product_desc = data.product.split(' | ')[1]
  
  //For influxdb tag keys, must add a forward slash \ before each space 
  product_desc = product_desc.split(' ').join('\\ ')

  let line = 'OrderPerformance,order_id=' + data.orderId + ',product_id=' + product_id + ',product_desc=' + product_desc + ' '

  //+ ',production_line=' + data.productionLine

  if (rowData) {
    if (rowData.completion_qty !== null && rowData.completion_qty !== undefined) {
      line += 'compl_qty=' + rowData.completion_qty + ','
    }
    if (rowData.machine_state !== null && rowData.machine_state !== undefined) {
      line += 'machine_state="' + rowData.machine_state + '"' + ','
    }
    if (rowData.scrap_qty !== null && rowData.scrap_qty !== undefined) {
      line += 'scrap_qty=' + rowData.scrap_qty + ','
    }
  }

  line += 'order_state="' + 'Planned' + '"' + ','
  line += 'order_date="' + data.date + '"' + ','
  line += 'production_line="' + data.productionLine + '"' + ','
  line += 'order_qty=' + data.orderQty + ','
  line += 'setpoint_rate=' + 0 + ','
  line += 'planned_rate=' + data.plannedRate

  // console.log(line);
  return line
}

/**
 * Write line to changed the record's status to 'Replaced'
 */
function writeOldInfluxLine(){
    //For influxdb tag keys, must add a forward slash \ before each space 
    let product_desc = rowData.product_desc.split(' ').join('\\ ')
  
    let line = 'OrderPerformance,order_id=' + rowData.order_id + ',product_id=' + rowData.product_id + ',product_desc=' + product_desc + ' '
  
    if (rowData.completion_qty !== null && rowData.completion_qty !== undefined) {
      line += 'completion_qty=' + rowData.completion_qty + ','
    }
    if (rowData.machine_state !== null && rowData.machine_state !== undefined) {
      line += 'machine_state="' + rowData.machine_state + '"' + ','
    }
    if (rowData.scrap_qty !== null && rowData.scrap_qty !== undefined) {
      line += 'scrap_qty=' + rowData.scrap_qty + ','
    }
    if (rowData.setpoint_rate !== null && rowData.setpoint_rate !== undefined) {
      line += 'setpoint_rate=' + rowData.setpoint_rate + ','
    }

  
    line += 'order_state="' + 'Replaced' + '"' + ','
    line += 'order_date="' + rowData.order_date + '"' + ','
    line += 'production_line="' + data.productionLine + '"' + ','
    line += 'order_qty=' + rowData.order_qty + ','
    line += 'planned_rate=' + rowData.planned_rate
  
    // console.log(line);
    return line
}

export { showOrderEditingForm }
