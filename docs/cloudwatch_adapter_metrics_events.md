# Cloudwatch Adapter Metrics and Events

This page describes the specific metrics and events supported by the AWS Adapter.

## All Products
All events and metrics include a field `aws_product=<product>`, which identifies the AWS Product related to the metric or event. `<product>` can be one of the following:

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

All metrics also include a field `units` which names the units of the `value` field in the point.

## CloudWatch Metrics

The [CloudWatch API](https://aws.amazon.com/documentation/cloudwatch/) documentation has a complete description of the metrics for each product.

###EC2

Also see the [EC2 CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/ec2-metricscollected.html).

`metric_type="AWS CloudWatch", namespace="AWS/EC2"`, plus the following:

- `name="CPUCreditUsage", value=<val>, item=<instance-id>`: The CPU Credit Usage over the last measurement period.
- `name="CPUCreditBalance", value=<val>, item=<instance-id>`: The CPU Credit Balance over the last measurement period.
- `name="CPUUtilization", value=<val>, item=<instance-id>`
- `name="DiskReadOps", value=<val>, item=<instance-id>`
- `name="DiskWriteOps", value=<val>, item=<instance-id>`
- `name="DiskReadBytes", value=<val>, item=<instance-id>`
- `name="DiskWriteBytes", value=<val>, item=<instance-id>`
- `name="NetworkIn", value=<val>, item=<instance-id>`
- `name="NetworkOut", value=<val>, item=<instance-id>`
- `name="StatusCheckFailed_Instance", value=<val>, item=<instance-id>`: This metric will only be reported if the value is non-zero.
- `name="StatusCheckFailed_System", value=<val>, item=<instance-id>`: This metric will only be reported if the value is non-zero.

###EBS

Also see the [EBS CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/ebs-metricscollected.html).

`metric_type="AWS CloudWatch", namespace="AWS/EBS"`, plus the following:

- `name="VolumeReadBytes", value=<val>, item=<volume-id>`
- `name="VolumeWriteBytes", value=<val>, item=<volume-id>`
- `name="VolumeReadOps", value=<val>, item=<volume-id>`
- `name="VolumeWriteOps", value=<val>, item=<volume-id>`
- `name="VolumeTotalReadTime", value=<val>, item=<volume-id>`
- `name="VolumeTotalWriteTime", value=<val>, item=<volume-id>`
- `name="VolumeIdleTime", value=<val>, item=<volume-id>`
- `name="VolumeQueueLength", value=<val>, item=<volume-id>`
- `name="VolumeThroughputPercentage", value=<val>, item=<volume-id>`
- `name="VolumeConsumedReadWriteOps", value=<val>, item=<volume-id>`

###ELB

Also see the [ELB CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/elb-metricscollected.html).

`metric_type="AWS CloudWatch", namespace="AWS/ELB"`, plus the following:

- `name="HealthyHostCount", value=<val>, item=<load-balancer-name>`
- `name="UnHealthyHostCount", value=<val>, item=<load-balancer-name>`
- `name="RequestCount", value=<val>, item=<load-balancer-name>`
- `name="Latency", value=<val>, item=<load-balancer-name>`
- `name="HTTPCode_ELB_4XX", value=<val>, item=<load-balancer-name>`
- `name="HTTPCode_ELB_5XX", value=<val>, item=<load-balancer-name>`
- `name="HTTPCode_Backend_2XX", value=<val>, item=<load-balancer-name>`
- `name="HTTPCode_Backend_3XX", value=<val>, item=<load-balancer-name>`
- `name="HTTPCode_Backend_4XX", value=<val>, item=<load-balancer-name>`
- `name="HTTPCode_Backend_5XX", value=<val>, item=<load-balancer-name>`
- `name="BackendConnectionErrors", value=<val>, item=<load-balancer-name>`
- `name="SurgeQueueLength", value=<val>, item=<load-balancer-name>`
- `name="SpilloverCount", value=<val>, item=<load-balancer-name>`

##RDS

Also see the [RDS CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/rds-metricscollected.html).

`metric_type="AWS CloudWatch", namespace="AWS/RDS"`, plus the following:

- `name="BinLogDiskUsage", value=<val>, item=<db-instance-name>`
- `name="CPUUtilization", value=<val>, item=<db-instance-name>`
- `name="CPUCreditUsage", value=<val>, item=<db-instance-name>`
- `name="CPUCreditBalance", value=<val>, item=<db-instance-name>`
- `name="DatabaseConnections", value=<val>, item=<db-instance-name>`
- `name="DiskQueueDepth", value=<val>, item=<db-instance-name>`
- `name="FreeableMemory", value=<val>, item=<db-instance-name>`
- `name="FreeStorageSpace", value=<val>, item=<db-instance-name>`
- `name="ReplicaLag", value=<val>, item=<db-instance-name>`
- `name="SwapUsage", value=<val>, item=<db-instance-name>`
- `name="ReadIOPS", value=<val>, item=<db-instance-name>`
- `name="WriteIOPS", value=<val>, item=<db-instance-name>`
- `name="ReadLatency", value=<val>, item=<db-instance-name>`
- `name="WriteLatency", value=<val>, item=<db-instance-name>`
- `name="ReadThroughput", value=<val>, item=<db-instance-name>`
- `name="WriteThroughput", value=<val>, item=<db-instance-name>`
- `name="NetworkReceiveThroughput", value=<val>, item=<db-instance-name>`
- `name="NetworkTransmitThroughput", value=<val>, item=<db-instance-name>`

###CloudFront

Also see the [CloudFront CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/cloudfront-metrics-dimensions.html).

`metric_type="AWS CloudWatch", namespace="AWS/CloudFront"`, plus the following:

- `name="Requests", value=<val>, item=<distribution-id>`
- `name="BytesDownloaded", value=<val>, item=<distribution-id>`
- `name="BytesUploaded", value=<val>, item=<distribution-id>`
- `name="TotalErrorRate", value=<val>, item=<distribution-id>`
- `name="4xxErrorRate", value=<val>, item=<distribution-id>`
- `name="5xxErrorRate", value=<val>, item=<distribution-id>`

###AutoScaling

Also see the [AutoScaling CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/as-metricscollected.html).

`metric_type="AWS CloudWatch", namespace="AWS/AutoScaling"`, plus the following:

- `name="GroupMinSize", value=<val>, item=<group-name>`
- `name="GroupMaxSize", value=<val>, item=<group-name>`
- `name="GroupDesiredCapacity", value=<val>, item=<group-name>`
- `name="GroupInServiceInstances", value=<val>, item=<group-name>`
- `name="GroupPendingInstances", value=<val>, item=<group-name>`
- `name="GroupStandbyInstances", value=<val>, item=<group-name>`
- `name="GroupTerminatingInstances", value=<val>, item=<group-name>`
- `name="GroupTotalInstances", value=<val>, item=<group-name>`

###ElastiCache

Also see the [ElastiCache CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/elasticache-metricscollected.html).

`metric_type="AWS CloudWatch", namespace="AWS/ElastiCache"`, plus the following:

The following CloudWatch metrics are available for all engine types:

- `name="CPUUtilization", value=<val>, item=<cluster-id>`
- `name="FreeableMemory", value=<val>, item=<cluster-id>`
- `name="NetworkBytesIn", value=<val>, item=<cluster-id>`
- `name="NetworkBytesOut", value=<val>, item=<cluster-id>`
- `name="SwapUsage", value=<val>, item=<cluster-id>`

The following additional CloudWatch metrics are available for redis engines:

- `name="BytesUsedForCache", value=<val>, item=<cluster-id>`
- `name="CacheHits", value=<val>, item=<cluster-id>`
- `name="CacheMisses", value=<val>, item=<cluster-id>`
- `name="CurrConnections", value=<val>, item=<cluster-id>`
- `name="Evictions", value=<val>, item=<cluster-id>`
- `name="HyperLogLogBasedCmds", value=<val>, item=<cluster-id>`
- `name="NewConnections", value=<val>, item=<cluster-id>`
- `name="Reclaimed", value=<val>, item=<cluster-id>`
- `name="ReplicationBytes", value=<val>, item=<cluster-id>`
- `name="ReplicationLag", value=<val>, item=<cluster-id>`
- `name="SaveInProgress", value=<val>, item=<cluster-id>`
- `name="CurrItems", value=<val>, item=<cluster-id>`
- `name="GetTypeCmds", value=<val>, item=<cluster-id>`
- `name="HashBasedCmds", value=<val>, item=<cluster-id>`
- `name="KeyBasedCmds", value=<val>, item=<cluster-id>`
- `name="ListBasedCmds", value=<val>, item=<cluster-id>`
- `name="SetBasedCmds", value=<val>, item=<cluster-id>`
- `name="SortedSetBasedCmds", value=<val>, item=<cluster-id>`
- `name="StringBasedCmds", value=<val>, item=<cluster-id>`
- `name="BytesUsedForCache", value=<val>, item=<cluster-id>`

The following additional CloudWatch metrics are available for memcached engines:

- `name="BytesUsedForCacheItems", value=<val>, item=<cluster-id>`
- `name="BytesReadIntoMemcached", value=<val>, item=<cluster-id>`
- `name="BytesWrittenOutFromMemcached", value=<val>, item=<cluster-id>`
- `name="CasBadval", value=<val>, item=<cluster-id>`
- `name="CasHits", value=<val>, item=<cluster-id>`
- `name="CasMisses", value=<val>, item=<cluster-id>`
- `name="CmdFlush", value=<val>, item=<cluster-id>`
- `name="CmdGet", value=<val>, item=<cluster-id>`
- `name="CmdSet", value=<val>, item=<cluster-id>`
- `name="CurrConnections", value=<val>, item=<cluster-id>`
- `name="CurrItems", value=<val>, item=<cluster-id>`
- `name="DecrHits", value=<val>, item=<cluster-id>`
- `name="DecrMisses", value=<val>, item=<cluster-id>`
- `name="DeleteHits", value=<val>, item=<cluster-id>`
- `name="DeleteMisses", value=<val>, item=<cluster-id>`
- `name="Evictions", value=<val>, item=<cluster-id>`
- `name="GetHits", value=<val>, item=<cluster-id>`
- `name="GetMisses", value=<val>, item=<cluster-id>`
- `name="IncrHits", value=<val>, item=<cluster-id>`
- `name="IncrMisses", value=<val>, item=<cluster-id>`
- `name="Reclaimed", value=<val>, item=<cluster-id>`
- `name="BytesUsedForHash", value=<val>, item=<cluster-id>`
- `name="CmdConfigGet", value=<val>, item=<cluster-id>`
- `name="CmdConfigSet", value=<val>, item=<cluster-id>`
- `name="CmdTouch", value=<val>, item=<cluster-id>`
- `name="CurrConfig", value=<val>, item=<cluster-id>`
- `name="EvictedUnfetched", value=<val>, item=<cluster-id>`
- `name="ExpiredUnfetched", value=<val>, item=<cluster-id>`
- `name="SlabsMoved", value=<val>, item=<cluster-id>`
- `name="TouchHits", value=<val>, item=<cluster-id>`
- `name="TouchMisses", value=<val>, item=<cluster-id>`
- `name="NewConnections", value=<val>, item=<cluster-id>`
- `name="NewItems", value=<val>, item=<cluster-id>`
- `name="UnusedMemory", value=<val>, item=<cluster-id>`

###Lambda

Also see the [Lambda CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/lam-metricscollected.html).

`metric_type="AWS CloudWatch", namespace="AWS/Lambda"`, plus the following:

- `name="Invocations", value=<val>, item=<function-name>`
- `name="Errors", value=<val>, item=<function-name>`
- `name="Duration", value=<val>, item=<function-name>`
- `name="Throttles", value=<val>, item=<function-name>`

