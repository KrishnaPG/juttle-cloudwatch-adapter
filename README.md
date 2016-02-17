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
read cloudwatch -period 300 -statistics ['Average'] -from :30 minutes ago: -to :now: item='EC2:i-00c5c6db'
    | filter name='CPUUtilization'
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
read [-period period] [-statistics [<stat>[, 'stat', ...]] [(product filter|item filter) [OR (product filter|item filter)]...]

read product="EC2"                                                        // Return all metrics for all EC2 instances
read item="EC2:i-966a694d"                                                // Return all metrics for the given EC2 instance
read product="EC2" OR product="EBS"                                       // Return all metrics for the set of EC2 instances and EBS volumes
read item="EC2:i-966a694d" OR item="EBS:vol-56130db1"                     // Return all metrics for the given EC2 instance and EBS volume
read product="RDS" OR item="EC2:i-966a694d" OR item="EBS:vol-56130db1"    // Return all metrics for all RDS instances.
                                                                          //    separately, return all metrics for the given EC2/EBS items
```

#### Options

Name             | Type   | Required | Description
-----------------|--------|----------|-------------
`from`           | time   | yes      | the start of the time period for which to fetch metrics
`to`             | time   | yes      | the end of the time period for which to fetch metrics
`period`         | number | no       | The aggregation window for metrics. Default 60 seconds.
`statistics`     | array  | no       | The CloudWatch aggregations to perform on the items for each time window. Examples 'Average', 'Minimum', 'Maximum', etc.

#### Filtering Expression

The filtering expression consists of any number of product or item filters, combined with `OR`.

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

An item filter has the format `item="<aws product>:<item name>"`. `<aws product>` is one of the above products. `<item name>` is the name of an item for the given product (EC2 Instance ID, EBS Volume Id, etc). Item filters control the items for which CloudWatch information is returned.

With no filter expression at all, the returned data will consist of all metrics for all supported products.

## Contributing

Want to contribute? Awesome! Don’t hesitate to file an issue or open a pull
request.
