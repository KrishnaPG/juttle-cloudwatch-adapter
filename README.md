# Juttle CloudWatch Adapter

Cloudwatch adapter for the [Juttle data flow
language](https://github.com/juttle/juttle).

The Cloudwatch adapter fetches metrics from the [Amazon CloudWatch API](https://aws.amazon.com/cloudwatch/) and returns those metrics for use in juttle programs. The adapter must be configured with an IAM Keypair to access the customer's AWS information and be given the region in which the customer's AWS products are located.

The full set of metrics and events are described [here](./docs/cloudwatch_adapter_metrics_events.md).

The Cloudwatch Adapter is very closely related to the [Juttle AWS Adapter](https://github.com/juttle/juttle-aws-adapter). The Cloudwatch adapter fetches historical monitoring information for the specific items in a user's AWS infrastructure. The AWS adapter fetches current information about the demographics, capabilities, and configuration of a user's AWS resources and applications.

## AWS Product Coverage

The adapter is known to work with the following products:

- [Elastic Compute (EC2)](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring_ec2.html)
- [Elastic Load Balancing (ELB)](http://docs.aws.amazon.com/ElasticLoadBalancing/latest/DeveloperGuide/elb-cloudwatch-metrics.html)
- [Relational Database Service (RDS)](http://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.html)
- [Elastic Block Store (EBS)](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-volume-status.html)
- [CloudFront CDN](http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/monitoring-using-cloudwatch.html)
- [Auto Scaling](http://docs.aws.amazon.com/AutoScaling/latest/DeveloperGuide/as-instance-monitoring.html)
- [ElastiCache](http://docs.aws.amazon.com/AmazonElastiCache/latest/UserGuide/CacheMetrics.html)
- [Lambda](http://docs.aws.amazon.com/lambda/latest/dg/monitoring-functions.html)

## Examples

```
read cloudwatch -period 300 -statistics ['Average'] -last :30 minutes: product="EC2" AND item='i-00c5c6db' AND metric='CPUUtilization'
    | view table

┌────────────────────────────────────┬─────────────────────┬──────────────────────────┬───────────────┬───────────────┬─────────────────────┬──────────────┬───────────┬──────────────┬───────────┐
│ time                               │ name                │ value                    │ dimension     │ item          │ metric_type         │ namespace    │ product   │ statistic    │ units     │
├────────────────────────────────────┼─────────────────────┼──────────────────────────┼───────────────┼───────────────┼─────────────────────┼──────────────┼───────────┼──────────────┼───────────┤
│ 2016-02-17T19:01:00.000Z           │ CPUUtilization      │ 6.934                    │ InstanceId    │ i-00c5c6db    │ AWS CloudWatch      │ AWS/EC2      │ EC2       │ Average      │ Percent   │
├────────────────────────────────────┼─────────────────────┼──────────────────────────┼───────────────┼───────────────┼─────────────────────┼──────────────┼───────────┼──────────────┼───────────┤
│ 2016-02-17T19:06:00.000Z           │ CPUUtilization      │ 7.132                    │ InstanceId    │ i-00c5c6db    │ AWS CloudWatch      │ AWS/EC2      │ EC2       │ Average      │ Percent   │
├────────────────────────────────────┼─────────────────────┼──────────────────────────┼───────────────┼───────────────┼─────────────────────┼──────────────┼───────────┼──────────────┼───────────┤
│ 2016-02-17T19:11:00.000Z           │ CPUUtilization      │ 6.862                    │ InstanceId    │ i-00c5c6db    │ AWS CloudWatch      │ AWS/EC2      │ EC2       │ Average      │ Percent   │
├────────────────────────────────────┼─────────────────────┼──────────────────────────┼───────────────┼───────────────┼─────────────────────┼──────────────┼───────────┼──────────────┼───────────┤
│ 2016-02-17T19:16:00.000Z           │ CPUUtilization      │ 1.934                    │ InstanceId    │ i-00c5c6db    │ AWS CloudWatch      │ AWS/EC2      │ EC2       │ Average      │ Percent   │
├────────────────────────────────────┼─────────────────────┼──────────────────────────┼───────────────┼───────────────┼─────────────────────┼──────────────┼───────────┼──────────────┼───────────┤
│ 2016-02-17T19:21:00.000Z           │ CPUUtilization      │ 6.274                    │ InstanceId    │ i-00c5c6db    │ AWS CloudWatch      │ AWS/EC2      │ EC2       │ Average      │ Percent   │
├────────────────────────────────────┼─────────────────────┼──────────────────────────┼───────────────┼───────────────┼─────────────────────┼──────────────┼───────────┼──────────────┼───────────┤
│ 2016-02-17T19:26:00.000Z           │ CPUUtilization      │ 6.997999999999999        │ InstanceId    │ i-00c5c6db    │ AWS CloudWatch      │ AWS/EC2      │ EC2       │ Average      │ Percent   │
└────────────────────────────────────┴─────────────────────┴──────────────────────────┴───────────────┴───────────────┴─────────────────────┴──────────────┴───────────┴──────────────┴───────────┘
```

## Installation

Like Juttle itself, the adapter is installed as a npm package. Both Juttle and
the adapter need to be installed side-by-side:

```bash
$ npm install juttle
$ npm install juttle-cloudwatch-adapter
```

## Ecosystem

The juttle-cloudwatch-adapter fits into the overall Juttle Ecosystem as one of the adapters in the [below diagram](https://github.com/juttle/juttle/blob/master/docs/juttle_ecosystem.md):

[![Juttle Ecosystem](https://github.com/juttle/juttle/raw/master/docs/images/JuttleEcosystemDiagram.png)](https://github.com/juttle/juttle/blob/master/docs/juttle_ecosystem.md)

## Configuration

Configuration involves these steps:

1. Create an IAM access key ID and secret key that can access your account.
2. Add the appropriate configuration items to `.juttle/config.js`

### Create an IAM access key ID

[This page](https://aws.amazon.com/developers/access-keys/) provides a good introduction to IAM access keys and how to obtain them for your amazon account.

The key must have read-only access for the products for which you want to obtain metrics and events. The following default policy is sufficient:

- CloudWatchReadOnlyAccess

### Add the appropriate configuration items to `.juttle/config.js`

Add a config block like this to `.juttle/config.js`:

```Javascript
{
  "adapters": {
        "cloudwatch": {
            access_key: "--YOUR-ACCESS-KEY-HERE--",
            secret_key: "--YOUR-SECRET-KEY-HERE--",
            region: "--YOUR-REGION-HERE--"
         }
   }
}
```

Region is a region like `us-west-2`.

### Additional Supported Config Options

In addition to the above options, the following options can be included in the `cloudwatch` section of the adapter configuration:

Name                               | Type      | Required | Description
-----------------------------------|-----------|----------|-------------
`disable_every_warnings`           | boolean   | no       | Disable warnings when -every is set to less than 5 minutes
`disable_every_errors`             | boolean   | no       | Disable errors when -every is set to less than 1 minute

## Usage

### Read Options

Read command line format and examples:

```Javascript
read [-period period] [-statistics [<stat>[, 'stat', ...]] [(product/metric/item filter) [OR (product/metric/item filter)]...]
```

#### Options

Name             | Type   | Required | Description
-----------------|--------|----------|-------------
`from`           | time   | yes      | the start of the time period for which to fetch metrics
`to`             | time   | yes      | the end of the time period for which to fetch metrics
`period`         | number | no       | The aggregation window for metrics. Default 60 seconds.
`statistics`     | array  | no       | The CloudWatch aggregations to perform on the items for each time window. Examples 'Average', 'Minimum', 'Maximum', etc.

#### Filtering Expression

The filtering expression is a variable length list of conditions joined by OR. A condition is a product, a product + metric, a product + item, or a product + metric + item.

If no filtering expression is provided, the returned data will consist of all metrics for all supported products.

A product filter has the format `product="<aws product>"`, where `<aws product>` is one of the following:

- `EC2`
- `EBS`
- `ELB`
- `RDS`
- `CloudFront`
- `AutoScaling`
- `ElastiCache`
- `Lambda`

The returned data will consist of metrics for all items for the given product.

An item filter has the format `item="<item name>"`, specifying a specific item (e.g. "i-cc696a17" for EC2, "vol-56130db1" for EBS). If any item field is specified, the data returned is CloudWatch metrics for the specified item.

A metric filter has the format `metric="<metric>"`, specifying a specific metric (e.g. "CPUUtilization" for EC2, "VolumeReadBytes" for EBS). If any metric field is specified, only those CloudWatch metrics are returned.

To combine products and items, use AND (e.g. product="EC2" and item="i-cc696a17"). You can also specify items and metrics using a concise format with the product included, using the form `item="<aws product>:<item name>"` or `metric="<aws product>:<metric name>"`.

Other boolean logic such as NOT is not supported.

Here are some example filter expressions:

```Juttle
// A single product
read cloudwatch product="EC2" | ...

// Multiple products
read cloudwatch product="EC2" OR product="EBS" | ...

// A product and an item
read cloudwatch product="EC2" AND item="i-cc696a17" | ...

// A product and an item (concise format)
read cloudwatch item="EC2:i-cc696a17" | ...

// A product and a metric
read cloudwatch product="EC2" AND metric="CPUUtilization" | ...

// A product, metric, and item
read cloudwatch product="EC2" AND metric="CPUUtilization" AND item="i-cc696a17" | ...

// Groups of products, metrics, and items
read cloudwatch (product="EC2" AND item="i-cb955911" AND metric="DiskReadOps") OR
                 metric="EBS:DiskWriteBytes" OR
                 product="RDS"| ...
```

## Contributing

Want to contribute? Awesome! Don’t hesitate to file an issue or open a pull
request.
