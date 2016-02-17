# Cloudwatch Adapter Metrics and Events

This page describes the specific metrics and events supported by the AWS Adapter.

## All Products
All events and metrics include a field `product=<product>`, which identifies the AWS Product related to the metric or event. `<product>` can be one of the following:

- `EC2`
- `ELB`
- `RDS`
- `EBS`
- `CloudFront`
- `AutoScaling`
- `ElastiCache`
- `Lambda`

All metrics include a field `metric_type=<type>` with the value `AWS CloudWatch`. The [AWS Adapter](https://github.com/juttle/juttle-aws-adapter/blob/master/docs/aws_adapter_metrics_events.md) defines additional `metric_type` fields.

All metrics also include a field `namespace=<namespace>` which has one of the following values:

- `AWS/EC2`
- `AWS/EBS`
- `AWS/ELB`
- `AWS/RDS`
- `AWS/CloudFront`
- `AWS/AutoScaling`
- `AWS/ElastiCache`
- `AWS/Lambda`

The namespace is generally the same as the product. The one exception
is AutoScaling, which can return metrics in both the `AWS/EC2` and
`AWS/AutoScaling` namespaces.

All metrics also include a field `units` which names the units of the `value` field in the point.

All metrics include fields `dimension=<dimension>` and `item=<item>`
which describe the item for which the CloudWatch metrics are
calculated. This version of the adapter aggregates metrics by items
for a given product (EC2 instance id, EBS volume, etc).

## CloudWatch Metrics

The [CloudWatch API](https://aws.amazon.com/documentation/cloudwatch/) documentation has a complete description of the metrics for each product.

###EC2

Also see the [EC2 CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/ec2-metricscollected.html).

`metric_type="AWS CloudWatch", namespace="AWS/EC2", dimension="InstanceId", item=<instance-id>`, plus the following:

- `name="CPUCreditUsage", value=<count>`: The CPU Credit Usage over the last measurement period.
- `name="CPUCreditBalance", value=<count>`: The CPU Credit Balance over the last measurement period.
- `name="CPUUtilization", value=<percent>`
- `name="DiskReadOps", value=<count>`
- `name="DiskWriteOps", value=<count>`
- `name="DiskReadBytes", value=<bytes>`
- `name="DiskWriteBytes", value=<bytes>`
- `name="NetworkIn", value=<bytes>`
- `name="NetworkOut", value=<bytes>`
- `name="StatusCheckFailed_Instance", value=<count>`: This metric will only be reported if the value is non-zero.
- `name="StatusCheckFailed_System", value=<count>`: This metric will only be reported if the value is non-zero.

###EBS

Also see the [EBS CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/ebs-metricscollected.html).

`metric_type="AWS CloudWatch", namespace="AWS/EBS", dimension="VolumeId", item=<volume-id>`, plus the following:

- `name="VolumeReadBytes", value=<bytes>`
- `name="VolumeWriteBytes", value=<bytes>`
- `name="VolumeReadOps", value=<count>`
- `name="VolumeWriteOps", value=<count>`
- `name="VolumeTotalReadTime", value=<seconds>`
- `name="VolumeTotalWriteTime", value=<seconds>`
- `name="VolumeIdleTime", value=<seconds>`
- `name="VolumeQueueLength", value=<count>`
- `name="VolumeThroughputPercentage", value=<percent>`
- `name="VolumeConsumedReadWriteOps", value=<count>`

###ELB

Also see the [ELB CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/elb-metricscollected.html).

`metric_type="AWS CloudWatch", namespace="AWS/ELB", dimension="LoadBalancerName", item=<load-balancer-name>`, plus the following:

- `name="HealthyHostCount", value=<count>`
- `name="UnHealthyHostCount", value=<count>`
- `name="RequestCount", value=<count>`
- `name="Latency", value=<seconds>`
- `name="HTTPCode_ELB_4XX", value=<count>`
- `name="HTTPCode_ELB_5XX", value=<count>`
- `name="HTTPCode_Backend_2XX", value=<count>`
- `name="HTTPCode_Backend_3XX", value=<count>`
- `name="HTTPCode_Backend_4XX", value=<count>`
- `name="HTTPCode_Backend_5XX", value=<count>`
- `name="BackendConnectionErrors", value=<count>`
- `name="SurgeQueueLength", value=<count>`
- `name="SpilloverCount", value=<count>`

##RDS

Also see the [RDS CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/rds-metricscollected.html).

`metric_type="AWS CloudWatch", namespace="AWS/RDS", dimension="DBInstanceIdentifier", item=<db-instance-name>`, plus the following:

- `name="BinLogDiskUsage", value=<bytes>`
- `name="CPUUtilization", value=<percent>`
- `name="CPUCreditUsage", value=<count>`
- `name="CPUCreditBalance", value=<count>`
- `name="DatabaseConnections", value=<count>`
- `name="DiskQueueDepth", value=<count>`
- `name="FreeableMemory", value=<bytes>`
- `name="FreeStorageSpace", value=<bytes>`
- `name="ReplicaLag", value=<seconds>`
- `name="SwapUsage", value=<bytes>`
- `name="ReadIOPS", value=<count/second>`
- `name="WriteIOPS", value=<count/second>`
- `name="ReadLatency", value=<seconds>`
- `name="WriteLatency", value=<seconds>`
- `name="ReadThroughput", value=<bytes/second>`
- `name="WriteThroughput", value=<bytes/second>`
- `name="NetworkReceiveThroughput", value=<bytes/second>`
- `name="NetworkTransmitThroughput", value=<bytes/second>`

###CloudFront

Also see the [CloudFront CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/cloudfront-metrics-dimensions.html).

`metric_type="AWS CloudWatch", namespace="AWS/CloudFront", dimension="DistributionId", item=<distribution-id>`, plus the following:

- `name="Requests", value=<count>`
- `name="BytesDownloaded", value=<bytes>`
- `name="BytesUploaded", value=<bytes>`
- `name="TotalErrorRate", value=<percent>`
- `name="4xxErrorRate", value=<percent>`
- `name="5xxErrorRate", value=<percent>`

###AutoScaling

Also see the [AutoScaling CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/as-metricscollected.html).

`metric_type="AWS CloudWatch", namespace="AWS/AutoScaling", dimension="AutoScalingGroupName", item=<group-name>`, plus the following:

- `name="GroupMinSize", value=<count>`
- `name="GroupMaxSize", value=<count>`
- `name="GroupDesiredCapacity", value=<count>`
- `name="GroupInServiceInstances", value=<count>`
- `name="GroupPendingInstances", value=<count>`
- `name="GroupStandbyInstances", value=<count>`
- `name="GroupTerminatingInstances", value=<count>`
- `name="GroupTotalInstances", value=<count>`

###ElastiCache

Also see the [ElastiCache CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/elasticache-metricscollected.html).

`metric_type="AWS CloudWatch", namespace="AWS/ElastiCache", dimension="CacheClusterId", item=<cluster-id>`, plus the following:

The following CloudWatch metrics are available for all engine types:

- `name="CPUUtilization", value=<percent>`
- `name="FreeableMemory", value=<bytes>`
- `name="NetworkBytesIn", value=<bytes>`
- `name="NetworkBytesOut", value=<bytes>`
- `name="SwapUsage", value=<bytes>`

The following additional CloudWatch metrics are available for redis engines:

- `name="BytesUsedForCache", value=<bytes>`
- `name="CacheHits", value=<count>`
- `name="CacheMisses", value=<count>`
- `name="CurrConnections", value=<count>`
- `name="Evictions", value=<count>`
- `name="HyperLogLogBasedCmds", value=<count>`
- `name="NewConnections", value=<count>`
- `name="Reclaimed", value=<count>`
- `name="ReplicationBytes", value=<bytes>`
- `name="ReplicationLag", value=<seconds>`
- `name="SaveInProgress", value=<count>`
- `name="CurrItems", value=<count>`
- `name="GetTypeCmds", value=<count>`
- `name="HashBasedCmds", value=<count>`
- `name="KeyBasedCmds", value=<count>`
- `name="ListBasedCmds", value=<count>`
- `name="SetBasedCmds", value=<count>`
- `name="SetTypeCmds", value=<count>`
- `name="SortedSetBasedCmds", value=<count>`
- `name="StringBasedCmds", value=<count>`
- `name="BytesUsedForCache", value=<bytes>`

The following additional CloudWatch metrics are available for memcached engines:

- `name="BytesUsedForCacheItems", value=<bytes>`
- `name="BytesReadIntoMemcached", value=<bytes>`
- `name="BytesWrittenOutFromMemcached", value=<bytes>`
- `name="CasBadval", value=<count>`
- `name="CasHits", value=<count>`
- `name="CasMisses", value=<count>`
- `name="CmdFlush", value=<count>`
- `name="CmdGet", value=<count>`
- `name="CmdSet", value=<count>`
- `name="CurrConnections", value=<count>`
- `name="CurrItems", value=<count>`
- `name="DecrHits", value=<count>`
- `name="DecrMisses", value=<count>`
- `name="DeleteHits", value=<count>`
- `name="DeleteMisses", value=<count>`
- `name="Evictions", value=<count>`
- `name="GetHits", value=<count>`
- `name="GetMisses", value=<count>`
- `name="IncrHits", value=<count>`
- `name="IncrMisses", value=<count>`
- `name="Reclaimed", value=<count>`
- `name="BytesUsedForHash", value=<bytes>`
- `name="CmdConfigGet", value=<count>`
- `name="CmdConfigSet", value=<count>`
- `name="CmdTouch", value=<count>`
- `name="CurrConfig", value=<count>`
- `name="EvictedUnfetched", value=<count>`
- `name="ExpiredUnfetched", value=<count>`
- `name="SlabsMoved", value=<count>`
- `name="TouchHits", value=<count>`
- `name="TouchMisses", value=<count>`
- `name="NewConnections", value=<count>`
- `name="NewItems", value=<count>`
- `name="UnusedMemory", value=<bytes>`

###Lambda

Also see the [Lambda CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/lam-metricscollected.html).

`metric_type="AWS CloudWatch", namespace="AWS/Lambda", dimension="FunctionName", item=<function-name>`, plus the following:

- `name="Invocations", value=<count>`
- `name="Errors", value=<count>`
- `name="Duration", value=<milliseconds>`
- `name="Throttles", value=<count>`

