import { appEvents } from 'app/core/core'

const hostname = window.location.hostname
export const postgRestHost = 'http://' + hostname + ':5436/'
export const influxHost = 'http://' + hostname + ':8086/'

let _prodLineDetails

export const post = (url, line) => {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.onreadystatechange = handleResponse
    xhr.onerror = e => reject(e)
    xhr.send(line)

    function handleResponse () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          // console.log('200');
          var res = JSON.parse(xhr.responseText)
          resolve(res)
        } else if (xhr.status === 204) {
          // console.log('204');
          res = xhr.responseText
          resolve(res)
        } else {
          reject(this.statusText)
        }
      }
    }
  })
}

export const get = url => {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.onreadystatechange = handleResponse
    xhr.onerror = e => reject(e)
    xhr.send()

    function handleResponse () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var res = JSON.parse(xhr.responseText)
          resolve(res)
        } else {
          reject(this.statusText)
        }
      }
    }
  })
}

/**
 * pass in the line, return the line's default start time
 * @param {*} line
 */
export function getLineStartTime (line) {
  const l = line.split(' | ')
  const target = _prodLineDetails.filter(
    line =>
      line.site === l[0] && line.area === l[1] && line.production_line === l[2]
  )
  if (target.length === 0) {
    return '6:00:00'
  } else {
    if (target[0].start_time) {
      return target[0].start_time
    } else {
      return '6:00:00'
    }
  }
}

/**
 * It sends query to postgres db to get production line details and then
 * set the results global in this utils file for further uses.
 * Then execute the callback funtion when finished.
 */
export function queryProductionLineDetails () {
  const url =
    postgRestHost +
    'equipment?site=not.is.null&area=not.is.null&production_line=not.is.null&equipment=is.null'
  get(url)
    .then(res => {
      _prodLineDetails = res
    })
    .catch(e => {
      alert(
        'error',
        'Error',
        'An error has occurred due to ' +
          e +
          ', please refresh the page and try again'
      )
    })
}

export const alert = (type, title, msg) => {
  appEvents.emit('alert-' + type, [title, msg])
}

export const distinctElems = list => {
  return Array.from(new Set(list))
}

export const reconstruct = data => {
  if (data.length === 0) {
    return data
  }

  const cols = data[0].columns
  const rows = data[0].rows

  const result = []
  rows.forEach(row => {
    const obj = {}
    cols.forEach((col, k) => {
      obj[col.text] = row[k]
    })
    result.push(obj)
  })

  return result
}
