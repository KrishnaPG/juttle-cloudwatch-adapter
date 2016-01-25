# Juttle AWS Adapter

AWS adapter for the [Juttle data flow
language](https://github.com/juttle/juttle).

The AWS adapter polls metrics and events from the various AWS APIs and returns those metrics/events. The adapter must be configured with an IAM Keypair to access the customer's AWS information and be given the region in which the customer's AWS products are located.

The integration collects and sends 4 different types of information to the Jut Data node:

- **Demographic Information**: for each product, breakdowns by size, storage class, memory software version, etc.
- **Aggregate Information**: for each product, aggregate information such as the total number of EC2 instances, ELB gateways, etc. Also some aggregate information for the entire collection of items is collected such as total disk space, memory capacity, etc.
- **Changes**: When a new item is added to or removed from AWS, an event is generated tracking the change. For example, when a new EC2 instance is added, a "EC2 instance added" event is generated. Also, when anything related to a given item is changed, a "... changed" event is generated.
- **CloudWatch metrics**: For each item, CloudWatch metrics are collected and recorded. For example, for EC2 instances cpu usage, memory usage, network usage, etc. are all recorded on a per-instance basis. For Lambda functions, the time taken, number of times executed, etc. are collected.

The full set of metrics and events are described [here](./docs/aws_adapter_metrics_events.md).

## AWS Product Coverage

The adapter supports the following AWS Products:

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
read aws
    | filter demographic='EC2 Instance Type'
    | keep demographic, name, value
    | view table

┌───────────────┬──────────┬──────────────────────────┐
│ name          │ value    │ demographic              │
├───────────────┼──────────┼──────────────────────────┤
│ m3.medium     │ 39       │ EC2 Instance Type        │
├───────────────┼──────────┼──────────────────────────┤
│ m1.small      │ 5        │ EC2 Instance Type        │
├───────────────┼──────────┼──────────────────────────┤
│ m3.large      │ 5        │ EC2 Instance Type        │
├───────────────┼──────────┼──────────────────────────┤
│ m1.medium     │ 2        │ EC2 Instance Type        │
├───────────────┼──────────┼──────────────────────────┤
│ t1.micro      │ 4        │ EC2 Instance Type        │
├───────────────┼──────────┼──────────────────────────┤
│ c3.xlarge     │ 1        │ EC2 Instance Type        │
├───────────────┼──────────┼──────────────────────────┤
│ t2.micro      │ 3        │ EC2 Instance Type        │
├───────────────┼──────────┼──────────────────────────┤
│ c3.8xlarge    │ 1        │ EC2 Instance Type        │
├───────────────┼──────────┼──────────────────────────┤
│ m4.4xlarge    │ 1        │ EC2 Instance Type        │
├───────────────┼──────────┼──────────────────────────┤
│ m3.2xlarge    │ 2        │ EC2 Instance Type        │
├───────────────┼──────────┼──────────────────────────┤
│ c3.large      │ 1        │ EC2 Instance Type        │
├───────────────┼──────────┼──────────────────────────┤
│ c4.2xlarge    │ 1        │ EC2 Instance Type        │
├───────────────┼──────────┼──────────────────────────┤
│ m3.xlarge     │ 1        │ EC2 Instance Type        │
├───────────────┼──────────┼──────────────────────────┤
│ t2.small      │ 1        │ EC2 Instance Type        │
├───────────────┼──────────┼──────────────────────────┤
│ t2.medium     │ 1        │ EC2 Instance Type        │
└─────────────────────────────────────────────────────┘
```

## Installation

Like Juttle itself, the adapter is installed as a npm package. Both Juttle and
the adapter need to be installed side-by-side:

```bash
$ npm install juttle
$ npm install juttle-aws-adapter
```
## Configuration

Configuration involves these steps:

1. Create an IAM access key ID and secret key that can access your account.
2. Add the appropriate configuration items to `.juttle/config.js`

### Create an IAM access key ID

[This page](https://aws.amazon.com/developers/access-keys/) provides a good introduction to IAM access keys and how to obtain them for your amazon account.

The key must have read-only access for the products for which you want to obtain metrics and events. The following default policies are sufficient:

- AmazonEC2ReadOnlyAccess
- CloudWatchReadOnlyAccess
- AmazonRDSReadOnlyAccess
- CloudFrontReadOnlyAccess
- AmazonElastiCacheReadOnlyAccess
- AWSLambdaReadOnlyAccess


### Add the appropriate configuration items to `.juttle/config.js`

Add a config block like this to `.juttle/config.js`:

```Javascript
{
  "adapters": {
        "aws": {
            access_key: "--YOUR-ACCESS-KEY-HERE--",
            secret_key: "--YOUR-SECRET-KEY-HERE--",
            region: "--YOUR-REGION-HERE--"
         }
   }
}
```

Region is a region like `us-west-2`.

## Usage

### Read Options

Read command line format and examples:

```Javascript
read [-cloudwatch (true|false)] [(product filter|item filter) [OR (product filter|item filter)]...]

read product="EC2"                                                        // Return all metrics incl. CloudWatch for all EC2 instances
read item="EC2:i-966a694d"                                                // Return all CloudWatch metrics for the given EC2 instance
read -cloudwatch false product="EC2"                                      // Return non-CloudWatch metrics for the set of EC2 instances
read -cloudwatch false product="EC2" OR product="EBS"                     // Return non-CloudWatch metrics for the set of EC2 instances and EBS volumes
read item="EC2:i-966a694d" OR item="EBS:vol-56130db1"                     // Return all CloudWatch metrics for the given EC2 instance and EBS volume
read product="RDS" OR item="EC2:i-966a694d" OR item="EBS:vol-56130db1"    // Return all metrics incl. CloudWatch for all RDS instances.
                                                                          //    separately, return all CloudWatch metrics for the given EC2/EBS items
```

#### Options

Name | Type | Required | Description
-----|------|----------|-------------
`cloudwatch`  | boolean | no  | Whether or not to additionally return CloudWatch metrics for the given product. Default `true`. If `false`, can not specify an item filter in the filtering expression.

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

The returned data will consist of Aggregate Metrics, Demographic Metrics, and AWS Metrics for the specified products. With `cloudwatch=true`, all CloudWatch metrics will be returned for all items for the given product.

An item filter has the format `item="<aws product>:<item name>"`. `<aws product>` is one of the above products. `<item name>` is the name of an item for the given product (EC2 Instance ID, EBS Volume Id, etc). Item filters only relate to CloudWatch metrics, and control the items for which CloudWatch information is returned.

With no filter expression at all, the returned data will consist of all metrics and events for all supported products. Cloudwatch metrics will be included if `cloudwatch=true`.

## Contributing

Want to contribute? Awesome! Don’t hesitate to file an issue or open a pull
request.
