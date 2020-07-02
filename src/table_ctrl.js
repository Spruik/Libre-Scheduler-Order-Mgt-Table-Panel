import _ from 'lodash'
import $ from 'jquery'
import moment from 'moment'
import { MetricsPanelCtrl } from 'app/plugins/sdk'
import { transformDataToTable } from './transformers'
import { tablePanelEditor } from './editor'
import { columnOptionsTab } from './column_options'
import { TableRenderer } from './renderer'
import { showOrderEditingForm } from './order_form_ctrl'
import { showActionOptionsForm } from './action_options_form_ctrl'

import * as utils from './utils'
import * as cons from './constants'

import './css/style.css!'
import './css/instant-serach.css!'
import './css/datepicker.css!'
import './css/timepicker.css!'

const panelDefaults = {
  targets: [{}],
  transform: 'timeseries_to_columns',
  pageSize: null,
  showHeader: true,
  styles: [
    {
      type: 'date',
      pattern: 'Time',
      alias: 'Time',
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      headerColor: 'rgba(51, 181, 229, 1)'
    },
    {
      unit: 'short',
      type: 'number',
      alias: '',
      decimals: 2,
      headerColor: 'rgba(51, 181, 229, 1)',
      colors: [
        'rgba(245, 54, 54, 0.9)',
        'rgba(237, 129, 40, 0.89)',
        'rgba(50, 172, 45, 0.97)'
      ],
      colorMode: null,
      pattern: '/.*/',
      thresholds: []
    }
  ],
  columns: [],
  scroll: true,
  fontSize: '100%',
  sort: { col: 0, desc: true }
}

let _reconstructedData
let _ctrl

export class TableCtrl extends MetricsPanelCtrl {
  constructor (
    $scope,
    $injector,
    templateSrv,
    annotationsSrv,
    $sanitize,
    variableSrv
  ) {
    super($scope, $injector)

    this.pageIndex = 0

    if (this.panel.styles === void 0) {
      this.panel.styles = this.panel.columns
      this.panel.columns = this.panel.fields
      delete this.panel.columns
      delete this.panel.fields
    }

    _.defaults(this.panel, panelDefaults)

    this.events.on('data-received', this.onDataReceived.bind(this))
    this.events.on('data-error', this.onDataError.bind(this))
    this.events.on('data-snapshot-load', this.onDataReceived.bind(this))
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this))
    this.events.on('init-panel-actions', this.onInitPanelActions.bind(this))

    // Remove listener before add it
    $(document).off('click', 'tr.tr-affect#order-mgt-scheduler-table-tr')
    $(document).off('click', 'i.add-order-btn')
    // Show form if a row is clicked
    $(document).on(
      'click',
      'tr.tr-affect#order-mgt-scheduler-table-tr',
      function (e) {
        const rowData = $('td', this).map((index, td) => {
          if (td.childNodes.length === 2) {
            return td.childNodes[1].nodeValue
          } else if (td.childNodes.length === 1) {
            return $(td).text()
          } else {
            return ''
          }
        })

        const prodLineIndex = $scope.ctrl.colDimensions.indexOf(
          'production_line'
        )
        const orderIdIndex = $scope.ctrl.colDimensions.indexOf('order_id')
        const prodDescIndex = $scope.ctrl.colDimensions.indexOf('product_desc')
        const prodIdIndex = $scope.ctrl.colDimensions.indexOf('product_id')
        if (
          !~prodLineIndex ||
          !~orderIdIndex ||
          !~prodDescIndex ||
          !~prodIdIndex
        ) {
          utils.alert(
            'error',
            'Error',
            'Get not get this order from the database, please contact the dev team'
          )
        } else {
          showActionOptionsForm(
            rowData[prodLineIndex],
            rowData[orderIdIndex],
            rowData[prodDescIndex],
            rowData[prodIdIndex]
          )
        }
      }
    )

    // Show form with no data when the add btn is clicked
    $(document).on('click', 'i.add-order-btn', function () {
      showOrderEditingForm('', allData())
    })
  }

  onInitEditMode () {
    this.addEditorTab('Options', tablePanelEditor, 2)
    this.addEditorTab('Column Styles', columnOptionsTab, 3)
  }

  onInitPanelActions (actions) {
    actions.push({ text: 'Export CSV', click: 'ctrl.exportCsv()' })
  }

  issueQueries (datasource) {
    this.pageIndex = 0

    if (this.panel.transform === 'annotations') {
      this.setTimeQueryStart()
      return this.annotationsSrv
        .getAnnotations({
          dashboard: this.dashboard,
          panel: this.panel,
          range: this.range
        })
        .then(annotations => {
          return { data: annotations }
        })
    }

    return super.issueQueries(datasource)
  }

  onDataError () {
    this.dataRaw = []
    this.render()
  }

  onDataReceived (dataList) {
    dataList = this.reorderData(dataList) // put production line in the first column
    dataList = this.filter(dataList) // filter out those with status of 'replaced' or 'deleted' and those that are not in the time range
    dataList = this.sort(dataList, 'scheduled_start_datetime') // sort rows so that all rows are sort/order by scheduled_start_time

    _reconstructedData = utils.reconstruct(dataList)

    this.dataRaw = dataList
    this.pageIndex = 0

    // automatically correct transform mode based on data
    if (this.dataRaw && this.dataRaw.length) {
      if (this.dataRaw[0].type === 'table') {
        this.panel.transform = 'table'
      } else {
        if (this.dataRaw[0].type === 'docs') {
          this.panel.transform = 'json'
        } else {
          if (
            this.panel.transform === 'table' ||
            this.panel.transform === 'json'
          ) {
            this.panel.transform = 'timeseries_to_rows'
          }
        }
      }
    }

    utils.queryProductionLineDetails()

    this.render()
  }

  // Reorder the column to put the productionLine go first.
  reorderData (dataList) {
    if (dataList.length === 0) {
      return dataList
    }

    if (dataList[0].columns) {
      const index = dataList[0].columns.findIndex(
        col => col.text.toLowerCase() === 'production_line'
      )
      if (index !== -1) {
        // store data
        const proLineCol = dataList[0].columns[index]
        // remove data from original position
        dataList[0].columns.splice(index, 1)
        // insert data to index 1 with the stored obj
        dataList[0].columns.splice(1, 0, proLineCol)

        // reorder for each row data
        for (let i = 0; i < dataList[0].rows.length; i++) {
          const row = dataList[0].rows[i]
          const proLineCol = row[index]
          row.splice(index, 1)
          row.splice(1, 0, proLineCol)
        }
      }
    }
    return dataList
  }

  // filter out records that are not of status of 'Replaced'
  filter (dataList) {
    if (dataList.length === 0) {
      return dataList
    }

    let rows = dataList[0].rows
    rows = rows.filter(row => {
      const lowerCaseRow = row.map(elem =>
        typeof elem === 'string' ? elem.toLowerCase() : elem
      )
      if (
        lowerCaseRow.indexOf(cons.STATE_REPLACED) === -1 &&
        lowerCaseRow.indexOf(cons.STATE_DELETED) === -1
      ) {
        return row
      }
    })
    dataList[0].rows = rows
    return dataList
  }

  // sort by schedule start time
  sort (dataList, key) {
    if (dataList.length === 0) {
      return dataList
    }

    const cols = dataList[0].columns
    const index = this.find(key, cols)
    dataList[0].rows.sort((a, b) => a[index] - b[index])

    return dataList
  }

  // find index related to the key in the columns
  find (key, cols) {
    let index = 0
    for (const [i, col] of cols.entries()) {
      if (col.text === key) {
        index = i
        break
      }
    }
    return index
  }

  render () {
    this.table = transformDataToTable(this.dataRaw, this.panel)
    // this.table.sort(this.panel.sort);
    this.renderer = new TableRenderer(
      this.panel,
      this.table,
      this.dashboard.isTimezoneUtc(),
      this.$sanitize,
      this.templateSrv,
      this.col
    )

    return super.render(this.table)
  }

  toggleColumnSort (col, colIndex) {
    // remove sort flag from current column
    if (this.table.columns[this.panel.sort.col]) {
      this.table.columns[this.panel.sort.col].sort = false
    }

    if (this.panel.sort.col === colIndex) {
      if (this.panel.sort.desc) {
        this.panel.sort.desc = false
      } else {
        this.panel.sort.col = null
      }
    } else {
      this.panel.sort.col = colIndex
      this.panel.sort.desc = true
    }
    this.render()
  }

  exportCsv () {
    const scope = this.$scope.$new(true)
    scope.tableData = this.renderer.render_values()
    scope.panel = 'table'
    this.publishAppEvent('show-modal', {
      templateHtml:
        '<export-data-modal panel="panel" data="tableData"></export-data-modal>',
      scope,
      modalClass: 'modal--narrow'
    })
  }

  link (scope, elem, attrs, ctrl) {
    let data
    const panel = ctrl.panel
    let pageCount = 0
    _ctrl = ctrl

    function getTableHeight () {
      let panelHeight = ctrl.height

      if (pageCount > 1) {
        panelHeight -= 26
      }

      return panelHeight - 31 + 'px'
    }

    function appendTableRows (tbodyElem) {
      ctrl.renderer.setTable(data)
      tbodyElem.empty()
      tbodyElem.html(ctrl.renderer.render(ctrl.pageIndex))
    }

    function switchPage (e) {
      const el = $(e.currentTarget)
      ctrl.pageIndex = parseInt(el.text(), 10) - 1
      renderPanel()
    }

    function appendPaginationControls (footerElem) {
      footerElem.empty()

      const pageSize = panel.pageSize || 100
      pageCount = Math.ceil(data.rows.length / pageSize)
      if (pageCount === 1) {
        return
      }

      const startPage = Math.max(ctrl.pageIndex - 3, 0)
      const endPage = Math.min(pageCount, startPage + 9)

      const paginationList = $('<ul></ul>')

      for (let i = startPage; i < endPage; i++) {
        const activeClass = i === ctrl.pageIndex ? 'active' : ''
        const pageLinkElem = $(
          '<li><a class="table-panel-page-link pointer ' +
            activeClass +
            '">' +
            (i + 1) +
            '</a></li>'
        )
        paginationList.append(pageLinkElem)
      }

      footerElem.append(paginationList)
    }

    function renderPanel () {
      const panelElem = elem.parents('.panel-content')
      const rootElem = elem.find('.table-panel-scroll')
      const tbodyElem = elem.find('tbody')
      const footerElem = elem.find('.table-panel-footer')

      elem.css({ 'font-size': panel.fontSize })
      panelElem.addClass('table-panel-content')

      appendTableRows(tbodyElem)
      appendPaginationControls(footerElem)

      const height = parseInt(getTableHeight().split('px')[0]) - 38 + 'px'
      rootElem.css({ 'max-height': panel.scroll ? height : '' })

      // get current table column dimensions
      if (ctrl.table.columns) {
        ctrl.colDimensions = ctrl.table.columns
          .filter(x => !x.hidden)
          .map(x => x.text)
      }
    }

    // hook up link tooltips
    elem.tooltip({
      selector: '[data-link-tooltip]'
    })

    function addFilterClicked (e) {
      const filterData = $(e.currentTarget).data()
      const options = {
        datasource: panel.datasource,
        key: data.columns[filterData.column].text,
        value: data.rows[filterData.row][filterData.column],
        operator: filterData.operator
      }

      ctrl.variableSrv.setAdhocFilter(options)
    }

    elem.on('click', '.table-panel-page-link', switchPage)
    elem.on('click', '.table-panel-filter-link', addFilterClicked)

    const unbindDestroy = scope.$on('$destroy', () => {
      elem.off('click', '.table-panel-page-link')
      elem.off('click', '.table-panel-filter-link')
      unbindDestroy()
    })

    ctrl.events.on('render', renderData => {
      data = renderData || data
      if (data) {
        renderPanel()
      }
      ctrl.renderingCompleted()
    })
  }
}

export function allData () {
  return _reconstructedData
}

export function refreshDashboard () {
  _ctrl.timeSrv.refreshDashboard()
}

TableCtrl.templateUrl = 'public/plugins/libre-scheduler-order-mgt-table-panel/partials/module.html'
