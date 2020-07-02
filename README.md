# Libre Order Mgt Table Panel for scheduler

| A Libre panel to create, schedule and release orders for manufacture

This panel gives a scheduler the ability to create, update and delete manufacturing orders for a production line and product. In addition to creating orders, this panel allows schedulers to release an order for manufacture. Business rules are in place to prevent changes to an order that has already been executed on. This panel is part of [Libre](https://github.com/Spruik/Libre). This plugin interfaces to a no security json rest api for equipment, orders and products running on the same grafana server. This panel is targeted at Grafana v6.x.x. only.

![Panel](./docs/libre-scheduler-order-mgt-table-panel.gif)

## Installation

The easiest way to get started with this plugin is to [download the latest release](https://github.com/Spruik/Libre-Scheduler-Order-Mgt-Table-Panel/releases/latest/download/libre-scheduler-order-mgt-table-panel.zip), unzip into grafana plugin directory and restart grafana.

Download the latest release

```shell
$ wget https://github.com/Spruik/Libre-Scheduler-Order-Mgt-Table-Panel/releases/latest/download/libre-scheduler-order-mgt-table-panel.zip
Resolving github.com (github.com)... 140.82.114.4
...
2020-06-24 20:47:59 (1.08 MB/s) - 'libre-scheduler-order-mgt-table-panel.zip' saved [90150]
```

Unzip into your Grafana plugin directory

```shell
$ unzip libre-scheduler-order-mgt-table-panel.zip -d /var/lib/grafana/plugins
Archive: libre-scheduler-order-mgt-table-panel.zip
...
inflating: /var/lib/grafana/libre-scheduler-order-mgt-table-panel/utils.js.map
```

Restart Grafana

```shell
$ service grafana-server restart
 * Stopping Grafana Server
 * Starting Grafana Server
```

## Usage

In order to get the most out of this panel:

1. Add a InfluxDB *Table* metric to query orders.

```influxdb
SELECT
  "order_date"e
  ,last("order_state")
  ,"order_qty"
  ,"planned_rate"
FROM "OrderPerformance"
WHERE $timeFilter
GROUP BY
  "product_desc"
  ,"production_line"
  ,"order_id"
  ,"product_id"
```

2. Apply custom column styles:

| Column                   | Type   | Name Override       | Other |
|--------------------------|--------|---------------------|-------|
| Time                     | Hidden |                     |   -   |
| production_line          | String | Productuction Line  |   -   |
| order_id                 | String | Order ID            |   -   |
| product_desc             | String | Product Description |   -   |
| product_id               | String | Product ID          |   -   |
| order_date               | String | Order Date          |   -   |
| status                   | String | Status              |   -   |
| order_qty                | String | Order Quantity      |   -   |
| planned_rate             | String | Planned Rate        |   -   |
| planned_changeover_time  | Hidden |                     |   -   |
| scheduled_start_datetime | Hidden |                     |   -   |
| scheduled_end_datetime   | Hidden |                     |   -   |

![Panel Metrics](./docs/libre-scheduler-order-mgt-table-panel-metrics.png)

### Orders

#### Add

To Add an order click the plus at the top right, enter details and submit.

#### Edit / Release

To edit an order click it in the table. In the actions popup click update. Orders can only be editted if they are in the _created_ or _released_ state. Orders that have progressed further can no longer be edited.

To release an order click the row from the table. In the action popup click Release.

#### Delete

To delete an order click it in the table. In the actions popup click delete.

## Developing

### Getting Started

A docker-compose and grunt script is provided in order to quickly evaluate source code changes. This requires

Prerequisites

- docker (>= 18 required)
- docker-compose (>= 1.25 required)
- node (>= 12 required)
- npm (>= 6 required)

Start by cloning this repository

```shell
~/
$ git clone https://github.com/Spruik/Libre-Scheduler-Order-Mgt-Table-Panel
Cloning into 'libre-scheduler-order-mgt-table-panel'...
remote: Enumerating objects: 46, done.
remote: Counting objects: 100% (46/46), done.
remote: Compressing objects: 100% (31/31), done.
remote: Total 46 (delta 13), reused 46 (delta 13), pack-reused 0
Unpacking objects: 100% (46/46), done.
```

Enter project and install dependencies

```shell
$ cd ./libre-scheduler-order-mgt-table-panel
~/libre-scheduler-order-mgt-table-panel
$ npm install
...
added 714 packages from 399 contributors and audited 719 packages in 11.871s
found 42 vulnerabilities (11 low, 6 moderate, 25 high)
  run `npm audit fix` to fix them, or `npm audit` for details
```

Install Grunt globally

```shell
$ npm install grunt -g
C:\Users\user\AppData\Roaming\npm\grunt -> C:\Users\user\AppData\Roaming\npm\node_modules\grunt\bin\grunt
+ grunt@1.1.0
updated 1 package in 1.364s
```

Run grunt to build the panel

```shell
$ grunt

Running "copy:src_to_dist" (copy) task
Created 2 directories, copied 8 files

Running "copy:libs" (copy) task

Running "copy:pluginDef" (copy) task
Copied 1 file

Running "copy:image_to_dist" (copy) task

Running "babel:dist" (babel) task

Done, without errors.

```

Start docker-compose.dev.yml detached

```shell
~/libre-scheduler-order-mgt-table-panel
$ docker-compose -f docker-compose.dev.yml up -d
Starting libre-scheduler-order-mgt-table-panel_postgres_1
Starting libre-scheduler-order-mgt-table-panel_postrest_1
Starting libre-scheduler-order-mgt-table-panel_simulator_1
Starting libre-scheduler-order-mgt-table-panel_grafana_1
```

Run grunt watch to recompile on change

```shell
~/libre-scheduler-order-mgt-table-panel
$ grunt watch
Running "watch" task
Waiting...
```

Open your favourite editor and start editing ./src files. The grunt watch task will detect this and recompile the panel. Use your favourite web browser and point to http://localhost:3000 login and create a dashboard with this panel. Your browser will need to be refreshed to reflect your changes to this panel, ensure your browser isn't caching files.

### Building

Prerequisites

- node (>= 12 required)
- npm (>= 6 required)

Build panel and zip into archive

```shell
~/libre-scheduler-order-mgt-table-panel
$ grunt build
Running "clean:0" (clean) task
>> 1 path cleaned.

Running "clean:1" (clean) task
>> 1 path cleaned.

Running "copy:src_to_dist" (copy) task
Created 3 directories, copied 9 files

Running "copy:libs" (copy) task


Running "copy:readme" (copy) task
Created 1 directory, copied 8 files

Running "string-replace:dist" (string-replace) task

1 files created

Running "copy:pluginDef" (copy) task
Copied 1 file

Running "babel:dist" (babel) task

Running "compress:main" (compress) task
>> Compressed 44 files.

Done, without errors.
```

Find a completed build of this panel in the root directory named `libre-scheduler-order-mgt-table-panel.zip`.

## Contributing

For any issue, there are fundamentally three ways an individual can contribute:

- By opening the issue for discussion: For instance, if you believe that you have uncovered a bug in, creating a new issue in the [GitHub issue tracker](https://github.com/Spruik/Libre-Scheduler-Order-Mgt-Table-Panel/issues) is the way to report it.
- By helping to triage the issue: This can be done either by providing supporting details (a test case that demonstrates a bug), or providing suggestions on how to address the issue.
- By helping to resolve the issue: Typically, this is done either in the form of demonstrating that the issue reported is not a problem after all, or more often, by opening a Pull Request that changes some bit of something in the panel in a concrete and reviewable manner.

## Change log

- 1.0.0 Initial Public Release
