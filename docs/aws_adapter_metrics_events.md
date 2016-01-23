# AWS Adapter Metrics and Events

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

All metrics include a field `metric_type=<type>` which has one of the following values:

- `metric_type=AWS Aggregate`: the metric is an aggregate metric counting some property across the entire collection of items
- `metric_type=AWS Demographic`: the metric is one of a set of metrics breaking down the set of items into one or more categories.
- `metric_type=AWS CloudWatch`: the metric covers some metric of a single item obtained via the CloudWatch API.
- `metric_type=AWS Metric`: the metric covers some metric of a single item obtained by product specific AWS API calls.

All CloudWatch metrics include a field `namespace=<namespace>` which has one of the following values:

- `AWS/EC2`
- `AWS/EBS`
- `AWS/ELB`
- `AWS/RDS`
- `AWS/CloudFront`
- `AWS/AutoScaling`
- `AWS/ElastiCache`
- `AWS/Lambda`

For each product, the integration can send events with the following format:

- `event_type="<AWS item> Added" item=<item id> msg=<msg>`: An item was added. `<AWS item>` examples are `EC2 Instance`, `RDS DB`, `ELB Load Balancer`, etc. `<item_id>` examples are `i-8a9dbf51`, `db-migration-testing-eeb2ed68`, `jx3ha-ELBauth-1MK7ZYWJBV7MB`, etc. `<msg>` is not always present but when present provides additional detail on the event.
- `event_type="<AWS item> Removed" item=<item id> msg=<msg>`: An item was removed.
- `event_type="<AWS item> Changed" item=<item id> msg=<msg>`: An item was changed.

##EC2

###Aggregate Metrics

- `aggregate="EC2 Instance Count", name=total, value=<count>`: The number of EC2 instances.

###Demographic Metrics

- `demographic="EC2 Instance Type", name=<type>, value=<count>`: A breakdown of EC2 instances by type. `<type>` examples are `m3.large`, `m3.medium`, etc.
- `demographic="EC2 Root Device Type", name=<type>, value=<count>`: A breakdown of EC2 instances by root device type. `<type>` examples are `ebs`, `instance-store`.
- `demographic="EC2 State", name=<state>, value=<count>`: A breakdown of EC2 instances by current state. `<state>` examples are `running`, `stopped`, `shutting-down`, etc.

###CloudWatch Metrics

Most of the metrics are self-explanatory, but the [EC2 CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/ec2-metricscollected.html) has a full description of the CloudWatch metrics.

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

##EBS

###Aggregate Metrics

- `aggregate="EBS Volume Count", name=total, value=<count>`: The number of EBS volumes.
- `aggregate="EBS Volume Total size", name=total, value=<gb>`: The total size of all volumes combined, in GB.
- `aggregate="EBS Volume Total iops", name=total, value=<iops>`: The total iops capability of all volumes combined, in io ops/sec

###Demographic Metrics

- `demographic="EBS Volume Type", name=<type>, value=<count>`: A breakdown of EBS volumes by type. `<type>` examples are `gp2`, `io1`, `standard`, etc.
- `demographic="EBS State", name=<state>, value=<count>`: A breakdown of EBS volumes by current state. `<state>` examples are `in-use`, `available`, `creating`, `deleting`, etc.
- `demographic="EBS Status", name=<status>, value=<count>`: A breakdown of EBS volumes by current status. `<status>` examples are `ok`, `impaired`, `insufficient-data`, etc.

###AWS Metrics

- `name="VolumeStatusErrors", value=<count> name=<volume-id> status=<status string>`: Counts the number of times the given volume had a status other than "ok". In this version, `<count>` can only be 1. This metric is only reported when the volume status is something other than ok. The status field provdes the exact status string.

###CloudWatch Metrics

Most of the metrics are self-explanatory, but the [EBS CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/ebs-metricscollected.html) has a full description of all the CloudWatch metrics.

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

##ELB

###Aggregate Metrics

- `aggregate="ELB Load Balancer Count", name=total, value=<count>`: The number of ELB load balancers.

###Demographic Metrics

- `demographic="ELB Scheme", name=<scheme>, value=<count>`: A breakdown of ELB load balancers by scheme. `<scheme>` examples are `internal` and `internet-facing`.
- `demographic="ELB Health Check Target", name=<target>, value=<count>`: A breakdown of ELB load balancers by the target (protocol + port + path) used to check health. `<target>` examples include `HTTP:80/robots.txt`, `HTTPS:3110/ping`, `TCP:80`, etc.

###CloudWatch Metrics

Most of the metrics are self-explanatory, but the [ELB CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/elb-metricscollected.html) has a full description of the CloudWatch metrics.

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

###Aggregate Metrics

- `aggregate="RDS DB Count", name=total, value=<count>`: The number of RDS databases.
- `aggregate="RDS DB Total Allocated Storage", name=total, value=<gb>`: The total allocated storage across the full set of databases.
- `aggregate="RDS DB Total Iops", name=total, value=<iops>`: The total iops capacity across the full set of databases, in io ops/sec.

###Demographic Metrics

- `demographic="RDS DB Class", name=<class>, value=<count>`: A breakdown of RDS databases by class. `<class>` examples are `db.t2.medium`, `db.m3.large`, etc.
- `demographic="RDS DB Engine", name=<engine>, value=<count>`: A breakdown of RDS databases by db engine. `<engine>` examples are `MySQL`, `oracle-sel`, `postgres`, etc.
- `demographic="RDS DB Engine Version", name=<version>, value=<count>`: A breakdown of RDS databases by version number. `<version>` examples are `9.3.3`, `5.6.19a`, etc.
- `demographic="RDS DB License Model", name=<license>, value=<count>`: A breakdown of RDS databases by open source license. <license> examples are `general-public-license`, `postgresql-license`, etc.
- `demographic="RDS DB Retention Period", name=<period>, value=<count>`: A breakdown of RDS databases by retention period (in days).
- `demographic="RDS DB PubliclyAccessible", name=<value>, value=<count>`: A breakdown of RDS databases by whether or not they are flagged as publicly accessible. `<value>` can be `true`, `false`, or `unknown` (if not explicitly configured, meaning that the network configuration determines whether or not it is accessible).
- `demographic="RDS DB Storage Type", name=<stype>, value=<count>`: A breakdown of RDS databases by storage type. `<stype>` examples are `gp2`, `io1`, `standard`, etc.
- `demographic="RDS DB Status", name=<status>, value=<count>`: A breakdown of RDS databases by current status. `<status>` examples are `available`, etc.
- `demographic="RDS DB Read Replica Status", name=<status>, value=<count>`: For those databases that are configured as read replicas, A breakdown by status. `<status>` examples are `replicating`, `error`, `stopped`, etc.

###CloudWatch Metrics

Most of the metrics are self-explanatory, but the [RDS CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/rds-metricscollected.html) has a full description of all the CloudWatch metrics.

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

##CloudFront

###Aggregate Metrics

- `aggregate="CF Distribution Count", name=total, value=<count>`: The number of CloudFront distributions.

###Demographic Metrics

- `demographic="CF Status", name=<status>, value=<count>`: A breakdown of CloudFront distributions by current status. `<status>` examples are `deployed`, `in-progress`, etc.
- `demographic="CF Price Class", name=<class>, value=<count>`: A breakdown of CloudFront distributions by price class. `<class>` examples are `PriceClass_100`, `PriceClass_All`, etc.
- `demographic="CF Enabled", name=<enabled>, value=<count>`: Counts of the number of enabled/disabled CloudFront distributions. `<enabled>` is `true` or `false`.

###CloudWatch Metrics

Most of the metrics are self-explanatory, but the [CloudFront CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/cloudfront-metrics-dimensions.html) has a full description of all the CloudWatch metrics.

`metric_type="AWS CloudWatch", namespace="AWS/CloudFront"`, plus the following:

- `name="Requests", value=<val>, item=<distribution-id>`
- `name="BytesDownloaded", value=<val>, item=<distribution-id>`
- `name="BytesUploaded", value=<val>, item=<distribution-id>`
- `name="TotalErrorRate", value=<val>, item=<distribution-id>`
- `name="4xxErrorRate", value=<val>, item=<distribution-id>`
- `name="5xxErrorRate", value=<val>, item=<distribution-id>`

##AutoScaling

###Aggregate Metrics

- `aggregate="AutoScaling Group Count", name=total, value=<count>`: The number of AutoScaling groups.
- `aggregate="AutoScaling Group Total Size", name=total, value=<count>`: The current number of EC2 instances allocated across all groups.
- `aggregate="AutoScaling Group Total Desired Capacity", name=total, value=<count>`: The desired number of EC2 instances allocated across all groups.

###Demographic Metrics

- `demographic="AutoScaling Desired Capacity", name=<capacity>, value=<count>`: A breakdown of the desired capacity across all groups. For example, `name=5 value=3` implies 3 groups have a desired capacity of 5.
- `demographic="AutoScaling Current Group Size", name=<capacity>, value=<count>`: A breakdown of the current size of each group. For example, `name=6 value=2` implies 2 groups currently consist of 6 instances.
- `demographic="AutoScaling Health Check Type", name=<type>, value=<count>`: A breakdown of the groups by health check type. `<type>` examples are `EC2` and `ELB`.

###CloudWatch Metrics

Most of the metrics are self-explanatory, but the [AutoScaling CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/as-metricscollected.html) has a full description of all the CloudWatch metrics.

`metric_type="AWS CloudWatch", namespace="AWS/AutoScaling"`, plus the following:

- `name="GroupMinSize", value=<val>, item=<group-name>`
- `name="GroupMaxSize", value=<val>, item=<group-name>`
- `name="GroupDesiredCapacity", value=<val>, item=<group-name>`
- `name="GroupInServiceInstances", value=<val>, item=<group-name>`
- `name="GroupPendingInstances", value=<val>, item=<group-name>`
- `name="GroupStandbyInstances", value=<val>, item=<group-name>`
- `name="GroupTerminatingInstances", value=<val>, item=<group-name>`
- `name="GroupTotalInstances", value=<val>, item=<group-name>`

##ElastiCache

###Aggregate Metrics

- `aggregate="ElastiCache Cluster Count", name=num_clusters, value=<count>`: The number of ElastiCache clusters.
- `aggregate="ElastiCache Total Cache Nodes", name=num_nodes, value=<count>`: The total number of nodes across all ElastiCache clusters.

###Demographic Metrics

- `demographic="ElastiCache Cache Node Type", name=<type>, value=<count>`: A breakdown of ElastiCache clusters by node type. `<type>` examples include `cache.t2.micro`, `cache.m3.large`, etc.
- `demographic="ElastiCache Engine", name=<engine>, value=<count>`: A breakdown of ElastiCache clusters by engine. `<engine>` examples include `memcached`, `redis`, etc.
- `demographic="ElastiCache Engine Version", name=<version>, value=<count>`: A breakdown of ElastiCache clusters by engine version. `<engine>` examples include `2.8.22`, `2.8.23`, etc.
- `demographic="ElastiCache Cluster Status", name=<status>, value=<count>`: A breakdown of ElastiCache clusters by status. `<status>` examples include `available`, `creating`, `modifying`, `snapshotting`, etc.
- `demographic="ElastiCache Num Cache Nodes", name=<node_count>, value=<count>`: A breakdown of ElastiCache clusters by the number of nodes in the cluster. For example, `name=6 value=2` implies 2 groups currently consist of 6 nodes.

###CloudWatch Metrics

Most of the metrics are self-explanatory, but the [ElastiCache CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/elasticache-metricscollected.html) has a full description of all the ElastiCache metrics.

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

##Lambda

###Aggregate Metrics

- `aggregate="Lambda Function Count", name=num_funcs, value=<count>`: The number of Lambda functions.
- `aggregate="Lambda Total Memory Size", name=num_mb, value=<count>`: The total memory usage (in MB) across all Lambda functions.

###Demographic Metrics

- `demographic="Lambda Runtime", name=<runtime>, value=<count>`:A breakdown of Lambda functions by runtime. `<runtime>` examples include `nodejs`, `java8`, `python2.7`, etc.
- `demographic="Lambda Role", name=<role>, value=<count>`: A breakdown of Lambda functions by IAM role. A `<role>` is an IAM identifier indicating the capabilities the function will have.
- `demographic="Lambda Timeout", name=<timeout>, value=<count>`: A breakdown of Lambda functions by timeout threshold (in seconds).
- `demographic="Lambda Memory Size", name=<size>, value=<count>`: A breakdown of Lambda functions by memory allocation given (in mb).
- `demographic="Lambda Version", name=<version>, value=<count>`: A breakdown of Lambda functions by version identifier.
- `demographic="Lambda Handler", name=<handler>, value=<count>`: A breakdown of Lambda functions by handler (entry point).

###CloudWatch Metrics

Most of the metrics are self-explanatory, but the [Lambda CloudWatch documentation](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/lam-metricscollected.html) has a full description of all the Lambda metrics.

`metric_type="AWS CloudWatch", namespace="AWS/Lambda"`, plus the following:

- `name="Invocations", value=<val>, item=<function-name>`
- `name="Errors", value=<val>, item=<function-name>`
- `name="Duration", value=<val>, item=<function-name>`
- `name="Throttles", value=<val>, item=<function-name>`

## CloudWatch Measurement Details

For all CloudWatch-related metrics, measurement is done over a 5 minute window, taking the average over that window.
