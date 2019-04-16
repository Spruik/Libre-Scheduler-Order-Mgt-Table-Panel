import { appEvents } from 'app/core/core'

const hostname = window.location.hostname
export const postgRestHost = 'http://' + hostname + ':5436/'
export const influxHost = 'http://' + hostname + ':8086/'

export let post = (url, line) => {
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

export let get = url => {
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
export function getLineStartTime(line){
  return '6:00:00'
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

  let result = []
  rows.forEach((row) => {
    let obj = {}
    cols.forEach((col, k) => {
      obj[col.text] = row[k]
    })
    result.push(obj)
  });
  
  return result
}