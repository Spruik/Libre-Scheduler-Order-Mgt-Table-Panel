import { showOrderEditingForm } from './order_form_ctrl'
import { appEvents } from 'app/core/core'
import * as utils from './utils'

let rowData
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
function showActionOptionsForm(productionLine, orderId, productDesc, productId){
  //get data
  let tags = {prodLine: productionLine, orderId: orderId, prodDesc: productDesc, prodId: productId}
  getRowData(callback, tags)

  function callback(){
    if(rowData.order_state.toLowerCase() !== 'planned' && rowData.order_state.toLowerCase() !== 'ready'){
      utils.alert('warning', 'Warning', 'This order is ' + rowData.order_state + ' and is no longer available for editing')
      return
    }

    appEvents.emit('show-modal', {
      src: 'public/plugins/smart-factory-scheduler-order-mgt-table-panel/partials/action_options.html',
      modalClass: 'confirm-modal',
      model: {}
    })

    removeListeners()
    addListeners()
  }
}

/**
 * Get the record data with the tag values passed in
 * Call the callback function once it is finished
 * Stop and prompt error when it fails
 * @param {*} callback 
 * @param {*} tags 
 */
function getRowData(callback, tags){
  const url = getInfluxLine(tags)
  console.log(url);
  console.log(tags);
  utils.get(url).then(res => {
    rowData = formatData(res)
    // console.log(rowData)
    callback()
  }).catch(e => {
    utils.alert('error', 'Error', 'An error occurred while getting data from the database, please try agian')
    console.log(e)
  })
}

/**
 * Write line for the influxdb query
 * @param {*} tags 
 */
function getInfluxLine(tags){
  const desc = tags.prodDesc.split('\'').join('\\\'')
  let url = utils.influxHost + 'query?pretty=true&db=smart_factory&q=select * from OrderPerformance' + ' where '
  url += 'production_line=' + '\'' + tags.prodLine + '\'' + ' and '
  url += 'order_id=' + '\'' + tags.orderId + '\'' + ' and '
  url += 'product_desc=' + '\'' + desc + '\'' + ' and '
  url += 'product_id=' + '\'' + tags.prodId + '\''

  // console.log(url)
  
  return url
}

/**
 * The params may contain more than one row record
 * This is to fomrat the http response into a better structure
 * And also filter out the latest record
 * @param {*} res 
 */
function formatData(res){
  let cols = res.results[0].series[0].columns
  let rows = res.results[0].series[0].values
  let row = rows[rows.length - 1]

  let data = {}
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    data[col] = row[i]
  }
  return data
}

/**
 * Add listener for the action selection
 * If edit clicked, go to the edit form with the current record data
 * If realease clicked, change record status to 'Ready'
 * If delete clicked, change record status to 'Deleted'
 */
function addListeners() {
  $(document).on('click', 'input[type="radio"][name="order-mgt-scheduler-actions-radio"]', e => {
    
    if (e.target.id === 'edit') {
      showOrderEditingForm(rowData)
    }else if (e.target.id === 'release') {
      if (rowData.order_state === 'Ready') {
        utils.alert('warning', 'Warning', 'Order has already been released')
        closeForm()
      }else {
        updateOrder('Ready')
      }
    }else if (e.target.id === 'delete') {
      updateOrder('Deleted')
    }

  })
}

/**
 * Remove listener for the action selection
 */
function removeListeners() {
  $(document).off('click', 'input[type="radio"][name="order-mgt-scheduler-actions-radio"]')
}

/**
 * Expect the action string (Normally are: 'Ready' or 'Deleted')
 * Use the action var passed in to write the line
 * Then update the record
 * Stop and prompt error if it fails
 * @param {*} action 
 */
function updateOrder(action) {
  const line = writeInfluxLine(action)
  const url = utils.influxHost + 'write?db=smart_factory'
  utils.post(url, line).then(res => {
    utils.alert('success', 'Success', 'Order has been marked as ' + action)
    closeForm()
  }).catch(e => {
    utils.alert('error', 'Database Error', 'An error occurred while fetching data from the postgresql, please check the basebase connection')
    closeForm()
    console.log(e)
  })
}

/**
 * Expect the status string (Normally are: 'Ready' or 'Deleted')
 * Then changed the status in the line with anything else unchanged
 * @param {*} status 
 */
function writeInfluxLine(status){
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

  line += 'order_state="' + status + '"' + ','
  line += 'order_date="' + rowData.order_date + '"' + ','
  line += 'production_line="' + rowData.production_line + '"' + ','
  line += 'order_qty=' + rowData.order_qty + ','
  line += 'planned_rate=' + rowData.planned_rate

//   console.log(line);
  return line
}

export { showActionOptionsForm }