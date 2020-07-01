## Order Mgt Table Panel for scheduler

| A Libre panel to create, schedule and release orders for manufacture

Custom Plugin that enables the scheduler to create and realease order

------

### InfluxDB Query example: 
SELECT "order_date", last("order_state"), "order_qty", "planned_rate" FROM "OrderPerformance" WHERE $timeFilter GROUP BY "product_desc", "production_line", "order_id", "product_id"

-------

### Data format
Data MUST be formatted as a TABLE!
