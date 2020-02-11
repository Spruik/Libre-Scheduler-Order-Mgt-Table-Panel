import * as utils from './utils';
import moment from 'moment';

export const writeUrl = utils.influxHost + 'write?db=smart_factory';

let hasTurnedAround = false;

/**
 * Expect the status string (Normally are: 'Ready' or 'Deleted')
 * Then changed the status in the line with anything else unchanged
 * @param {*} status
 */
export function writeLineForUpdate(status, data) {
  // For influxdb tag keys, must add a forward slash \ before each space

  let line = writeTags(data.order_id, data.product_id);

  if (data.compl_qty !== null && data.compl_qty !== undefined) {
    line += 'compl_qty=' + data.compl_qty + ',';
  }
  if (data.machine_state !== null && data.machine_state !== undefined) {
    line += 'machine_state="' + getRid(data.machine_state) + '"' + ',';
  }
  if (data.scrap_qty !== null && data.scrap_qty !== undefined) {
    line += 'scrap_qty=' + data.scrap_qty + ',';
  }
  if (data.setpoint_rate !== null && data.setpoint_rate !== undefined) {
    line += 'setpoint_rate=' + data.setpoint_rate + ',';
  }

  const startTime = data.scheduled_start_datetime
    ? data.scheduled_start_datetime
    : 0;
  const endTime = data.scheduled_end_datetime ? data.scheduled_end_datetime : 0;

  line += 'order_state="' + getRid(status) + '"' + ',';
  line += 'product_desc="' + getRid(data.product_desc) + '"' + ',';
  line += 'order_date="' + getRid(data.order_date) + '"' + ',';
  line +=
    'planned_changeover_time="' + data.planned_changeover_time + '"' + ',';
  line += 'scheduled_end_datetime=' + endTime + ',';
  line += 'scheduled_start_datetime=' + startTime + ',';
  line += 'production_line="' + getRid(data.production_line) + '"' + ',';
  line += 'order_qty=' + data.order_qty + ',';
  line += 'planned_rate=' + data.planned_rate;

  //   console.log('writeLineForUpdate');
  return line;
}

export function writeLineForUpdateWithChangingTime(
  data,
  currentStatus,
  startTime,
  endTime
) {
  const product_id = data.product.split(' | ')[0];
  let product_desc = data.product.split(' | ')[1];

  // For influxdb tag keys, must add a forward slash \ before each space
  // product_desc = product_desc.split(' ').join('\\ ')

  let line = writeTags(data.orderId, product_id);
  line += 'order_state="' + getRid(currentStatus) + '"' + ',';
  line += 'product_desc="' + getRid(product_desc) + '"' + ',';
  line += 'order_date="' + data.date + '"' + ',';
  line += 'production_line="' + getRid(data.productionLine) + '"' + ',';
  line += 'planned_changeover_time="' + data.changeover + '"' + ',';
  line += 'scheduled_end_datetime=' + endTime + ',';
  line += 'scheduled_start_datetime=' + startTime + ',';
  line += 'order_qty=' + data.orderQty + ',';
  line += 'setpoint_rate=' + 0 + ',';
  line += 'planned_rate=' + data.plannedRate;

  //   console.log('writeLineForUpdateWithChangingTime');
  return line;
}

/**
 * Prepare a line for influxdb request
 * @param {{}} data Expecting Object : The order data that is to be updated
 * @param {moment} timeDiff Expecting (Moment Duration Object): The time difference that this order is going to add / subtract
 * @param {string} action Expecting String : The action (add / subtract), example -> 'subtract'
 */
export function writeLineForTimeUpdate(data, timeDiff, action) {
  hasTurnedAround = false;
  const roundedTimeDiff = roundTime(timeDiff);

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

  let endTime =
    action === 'subtract'
      ? (endTime = moment(data.scheduled_end_datetime)
          .subtract(roundedTimeDiff)
          .valueOf())
      : (endTime = moment(data.scheduled_end_datetime)
          .add(roundedTimeDiff)
          .valueOf());

  let startTime =
    action === 'subtract'
      ? (startTime = moment(data.scheduled_start_datetime)
          .subtract(roundedTimeDiff)
          .valueOf())
      : (startTime = moment(data.scheduled_start_datetime)
          .add(roundedTimeDiff)
          .valueOf());

  // For influxdb tag keys, must add a forward slash \ before each space
  // let product_desc = data.product_desc.split(' ').join('\\ ')

  let line = writeTags(data.order_id, data.product_id);

  if (data.compl_qty !== null && data.compl_qty !== undefined) {
    line += 'compl_qty=' + data.compl_qty + ',';
  }
  if (data.machine_state !== null && data.machine_state !== undefined) {
    line += 'machine_state="' + getRid(data.machine_state) + '"' + ',';
  }
  if (data.scrap_qty !== null && data.scrap_qty !== undefined) {
    line += 'scrap_qty=' + data.scrap_qty + ',';
  }
  if (data.setpoint_rate !== null && data.setpoint_rate !== undefined) {
    line += 'setpoint_rate=' + data.setpoint_rate + ',';
  }

  line += 'order_state="' + getRid(data.status) + '"' + ',';
  line += 'product_desc="' + getRid(data.product_desc) + '"' + ',';
  line += 'order_date="' + getRid(data.order_date) + '"' + ',';
  line +=
    'planned_changeover_time="' + data.planned_changeover_time + '"' + ',';
  line += 'production_line="' + getRid(data.production_line) + '"' + ',';
  line += 'order_qty=' + data.order_qty + ',';
  line += 'scheduled_end_datetime=' + endTime + ',';
  line += 'scheduled_start_datetime=' + startTime + ',';
  line += 'planned_rate=' + data.planned_rate;

  //   console.log('writeLineForTimeUpdate');
  return line;
}

export function writeLineForUpdateWithRemovingTime(data, currentStatus) {
  const product_id = data.product.split(' | ')[0];
  let product_desc = data.product.split(' | ')[1];

  // For influxdb tag keys, must add a forward slash \ before each space
  // product_desc = product_desc.split(' ').join('\\ ')

  let line = writeTags(data.orderId, product_id);
  line += 'order_state="' + getRid(currentStatus) + '"' + ',';
  line += 'product_desc="' + getRid(product_desc) + '"' + ',';
  line += 'order_date="' + data.date + '"' + ',';
  line += 'production_line="' + getRid(data.productionLine) + '"' + ',';
  line += 'planned_changeover_time="' + data.changeover + '"' + ',';
  line += 'order_qty=' + data.orderQty + ',';
  line += 'setpoint_rate=' + 0 + ',';
  line += 'planned_rate=' + data.plannedRate;

  //   console.log('writeLineForUpdateWithRemovingTime');
  return line;
}

function writeTags(order_id, prod_id) {
  return `OrderPerformance,order_id=${order_id},product_id=${prod_id} `;
}

/**
 * Take a moment duration obj, take this obj's hours mins and seconds to make a new moment duration
 * The purpose is to make a new duration with rounded milsec that is easier for calculation
 * Return the new duration with rounded milsec
 * @param {moment duration obj} timeDiff The moment duration obj
 */
function roundTime(timeDiff) {
  const timeText = getTimeText(timeDiff);
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

  const hour = time.get('h') < 0 ? time.get('h') * -1 : time.get('h');
  const mins =
    time.get('minutes') < 0 ? time.get('minutes') * -1 : time.get('minutes');
  const seconds =
    time.get('seconds') < 0 ? time.get('seconds') * -1 : time.get('seconds');

  return hour + ':' + mins + ':' + seconds;
}

function getRid(x) {
  return x.split('"').join('\\"');
}
