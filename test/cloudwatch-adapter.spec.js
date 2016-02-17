'use strict';
var _ = require('underscore');
var juttle_test_utils = require('juttle/test/runtime/specs/juttle-test-utils');
var Juttle = require('juttle/lib/runtime').Juttle;
var CloudWatchAdapter = require('../');
var check_juttle = juttle_test_utils.check_juttle;
var expect = require('chai').expect;
var read_config = require('juttle/lib/config/read-config');

describe('cloudwatch adapter', function() {

    before(function() {

        // Try to read from the config file first. If not present,
        // look in the environment variable JUTTLE_AWS_CONFIG. In
        // TravisCI, the config is provided via the environment to
        // avoid putting sensitive information like ids/auth tokens in
        // source files.

        var config = read_config();
        var cloudwatch_config;

        if (_.has(config, 'adapters') &&
            _.has(config.adapters, 'cloudwatch')) {
            cloudwatch_config = config.adapters.cloudwatch;
        } else {

            if (! _.has(process.env, 'JUTTLE_CLOUDWATCH_CONFIG') ||
                process.env.JUTTLE_CLOUDWATCH_CONFIG === '') {
                throw new Error('To run this test, you must provide the adapter config via the environment as JUTTLE_CLOUDWATCH_CONFIG.');
            }
            cloudwatch_config = JSON.parse(process.env.JUTTLE_CLOUDWATCH_CONFIG);
        }

        var adapter = CloudWatchAdapter(cloudwatch_config, Juttle);

        Juttle.adapters.register(adapter.name, adapter);
    });

    describe(' properly returns errors/warnings for arguments like', function() {

        it(' an -every less than 5 minutes', function() {
            return check_juttle({
                program: 'read cloudwatch -every :1m: product="EC2" | view table'
            })
            .then(function(result) {
                expect(result.errors).to.have.length(0);
                expect(result.warnings).to.have.length(1);
                expect(result.warnings[0]).to.contain('-every of < 5 minutes may miss CloudWatch metrics');
            });
        });

        it(' an -every less than 1 minute', function() {
            return check_juttle({
                program: 'read cloudwatch -every :1s: product="EC2" | view table'
            })
            .catch(function(err) {
                expect(err.code).to.equal('RT-ADAPTER-UNSUPPORTED-TIME-OPTION');
            });
        });

        // XXX/mstemm ideally we'd like to have tests that test the
        // config-level overrides for -every warnings and errors work,
        // but there isn't any way to reconfigure or unload an adapter
        // right now.
    });

    describe(' can read metrics', function() {

        function validate_point(point, statistics) {
            var expected_dimensions = {
                AutoScaling: 'AutoScalingGroupName',
                CloudFront: 'DistributionId',
                EBS: 'VolumeId',
                EC2: 'InstanceId',
                ElastiCache: 'CacheClusterId',
                ELB: 'LoadBalancerName',
                Lambda: 'FunctionName',
                RDS: 'DBInstanceIdentifier'
            };

            var expected_metrics = {
                'AWS/AutoScaling': {
                    GroupMinSize: {units: 'Count'},
                    GroupMaxSize: {units: 'Count'},
                    GroupDesiredCapacity: {units: 'Count'},
                    GroupInServiceInstances: {units: 'Count'},
                    GroupPendingInstances: {units: 'Count'},
                    GroupStandbyInstances: {units: 'Count'},
                    GroupTerminatingInstances: {units: 'Count'},
                    GroupTotalInstances: {units: 'Count'}
                },
                'AWS/CloudFront': {
                    Requests: {units: 'Count'},
                    BytesDownloaded: {units: 'Bytes'},
                    BytesUploaded: {units: 'Bytes'},
                    TotalErrorRate: {units: 'Percent'},
                    '4xxErrorRate': {units: 'Percent'},
                    '5xxErrorRate': {units: 'Percent'}
                },
                'AWS/EBS': {
                    VolumeReadBytes: {units: 'Bytes'},
                    VolumeWriteBytes: {units: 'Bytes'},
                    VolumeReadOps: {units: 'Count'},
                    VolumeWriteOps: {units: 'Count'},
                    VolumeTotalReadTime: {units: 'Seconds'},
                    VolumeTotalWriteTime: {units: 'Seconds'},
                    VolumeIdleTime: {units: 'Seconds'},
                    VolumeQueueLength: {units: 'Count'},
                    VolumeThroughputPercentage: {units: 'Percent'},
                    VolumeConsumedReadWriteOps: {units: 'Count'}
                },
                'AWS/EC2': {
                    DiskReadOps: {units: 'Count'},
                    DiskWriteOps: {units: 'Count'},
                    DiskReadBytes: {units: 'Bytes'},
                    DiskWriteBytes: {units: 'Bytes'},
                    CPUUtilization: {units: 'Percent'},
                    NetworkOut: {units: 'Bytes'},
                    NetworkIn: {units: 'Bytes'},
                    CPUCreditUsage: {units: 'Count'},
                    CPUCreditBalance: {units: 'Count'},
                    StatusCheckFailed_Instance: {units: 'Count'},
                    StatusCheckFailed_System: {units: 'Count'}
                },
                'AWS/ElastiCache': {
                    CPUUtilization: {units: 'Percent'},
                    FreeableMemory: {units: 'Bytes'},
                    NetworkBytesIn: {units: 'Bytes'},
                    NetworkBytesOut: {units: 'Bytes'},
                    SwapUsage: {units: 'Bytes'},
                    BytesUsedForCache: {units: 'Bytes'},
                    CacheHits: {units: 'Count'},
                    CacheMisses: {units: 'Count'},
                    CurrConnections: {units: 'Count'},
                    Evictions: {units: 'Count'},
                    HyperLogLogBasedCmds: {units: 'Count'},
                    NewConnections: {units: 'Count'},
                    Reclaimed: {units: 'Count'},
                    ReplicationBytes: {units: 'Bytes'},
                    ReplicationLag: {units: 'Seconds'},
                    SaveInProgress: {units: 'Count'},
                    CurrItems: {units: 'Count'},
                    GetTypeCmds: {units: 'Count'},
                    HashBasedCmds: {units: 'Count'},
                    KeyBasedCmds: {units: 'Count'},
                    ListBasedCmds: {units: 'Count'},
                    SetBasedCmds: {units: 'Count'},
                    SetTypeCmds: {units: 'Count'},
                    SortedSetBasedCmds: {units: 'Count'},
                    StringBasedCmds: {units: 'Count'},
                    BytesUsedForCacheItems: {units: 'Count'},
                    BytesReadIntoMemcached: {units: 'Bytes'},
                    BytesWrittenOutFromMemcached: {units: 'Bytes'},
                    CasBadval: {units: 'Count'},
                    CasHits: {units: 'Count'},
                    CasMisses: {units: 'Count'},
                    CmdFlush: {units: 'Count'},
                    CmdGet: {units: 'Count'},
                    CmdSet: {units: 'Count'},
                    DecrHits: {units: 'Count'},
                    DecrMisses: {units: 'Count'},
                    DeleteHits: {units: 'Count'},
                    DeleteMisses: {units: 'Count'},
                    GetHits: {units: 'Count'},
                    GetMisses: {units: 'Count'},
                    IncrHits: {units: 'Count'},
                    IncrMisses: {units: 'Count'},
                    BytesUsedForHash: {units: 'Bytes'},
                    CmdConfigGet: {units: 'Count'},
                    CmdConfigSet: {units: 'Count'},
                    CmdTouch: {units: 'Count'},
                    CurrConfig: {units: 'Count'},
                    EvictedUnfetched: {units: 'Count'},
                    ExpiredUnfetched: {units: 'Count'},
                    SlabsMoved: {units: 'Count'},
                    TouchHits: {units: 'Count'},
                    TouchMisses: {units: 'Count'},
                    NewItems: {units: 'Count'},
                    UnusedMemory: {units: 'Bytes'}
                },
                'AWS/ELB': {
                    HealthyHostCount: {units: 'Count'},
                    UnHealthyHostCount: {units: 'Count'},
                    RequestCount: {units: 'Count'},
                    Latency: {units: 'Seconds'},
                    HTTPCode_ELB_4XX: {units: 'Count'},
                    HTTPCode_ELB_5XX: {units: 'Count'},
                    HTTPCode_Backend_2XX: {units: 'Count'},
                    HTTPCode_Backend_3XX: {units: 'Count'},
                    HTTPCode_Backend_4XX: {units: 'Count'},
                    HTTPCode_Backend_5XX: {units: 'Count'},
                    BackendConnectionErrors: {units: 'Count'},
                    SurgeQueueLength: {units: 'Count'},
                    SpilloverCount: {units: 'Count'}
                },
                'AWS/Lambda': {
                    Invocations: {units: 'Count'},
                    Errors: {units: 'Count'},
                    Duration: {units: 'Milliseconds'},
                    Throttles: {units: 'Count'}
                },
                'AWS/RDS': {
                    BinLogDiskUsage: {units: 'Bytes'},
                    CPUUtilization: {units: 'Percent'},
                    CPUCreditUsage: {units: 'Count'},
                    CPUCreditBalance: {units: 'Count'},
                    DatabaseConnections: {units: 'Count'},
                    DiskQueueDepth: {units: 'Count'},
                    FreeableMemory: {units: 'Bytes'},
                    FreeStorageSpace: {units: 'Bytes'},
                    ReplicaLag: {units: 'Seconds'},
                    SwapUsage: {units: 'Bytes'},
                    ReadIOPS: {units: 'Count/Second'},
                    WriteIOPS: {units: 'Count/Second'},
                    ReadLatency: {units: 'Seconds'},
                    WriteLatency: {units: 'Seconds'},
                    ReadThroughput: {units: 'Bytes/Second'},
                    WriteThroughput: {units: 'Bytes/Second'},
                    NetworkReceiveThroughput: {units: 'Bytes/Second'},
                    NetworkTransmitThroughput: {units: 'Bytes/Second'},

                    // Not documented on RDS Cloudwatch API page, but
                    // adding here so validation will still pass
                    TransactionLogsDiskUsage: {units: 'Bytes'}
                }
            };

            expect(point).to.contain.keys(['time', 'metric_type', 'product', 'namespace', 'name', 'dimension', 'item', 'statistic', 'value', 'units']);
            expect(point.metric_type).to.equal('AWS CloudWatch');
            expect(point.dimension).to.equal(expected_dimensions[point.product]);
            expect(_.keys(expected_dimensions)).to.include(point.product);

            // AutoScaling is slightly different--there can be
            // per-group metrics, in which case the namespace is
            // AWS/AutoScaling. Additionally, there are EC2-style
            // metrics for the group as a whole, which are returned
            // with the namespace AWS/EC2.
            if (point.product === 'AutoScaling') {
                expect(['AWS/AutoScaling', 'AWS/EC2']).to.include(point.namespace);
            } else {
                expect(point.namespace).to.equal(`AWS/${point.product}`);
            }

            expect(_.keys(expected_metrics[point.namespace])).to.include(point.name);
            expect(statistics).to.include(point.statistic);
            expect(point.units).to.equal(expected_metrics[point.namespace][point.name].units);
        }

        it(' using defaults (all products, statistics=Average)', function() {
            return check_juttle({
                program: 'read cloudwatch | view text'
            })
            .then(function(result) {
                expect(result.errors).to.have.length(0);
                expect(result.warnings).to.have.length(0);
                for(let point of result.sinks.text) {
                    validate_point(point, ['Average']);
                }
            });
        });

        it(' using EC2, statistics=Minimum', function() {
            return check_juttle({
                program: 'read cloudwatch -statistics ["Minimum"] product="EC2" | view text'
            })
            .then(function(result) {
                expect(result.errors).to.have.length(0);
                expect(result.warnings).to.have.length(0);
                for(let point of result.sinks.text) {
                    validate_point(point, ['Minimum']);
                }
            });
        });

        it(' using ELB, statistics=Average,Minimum', function() {
            return check_juttle({
                program: 'read cloudwatch -statistics ["Minimum", "Average"] product="ELB" | view text'
            })
            .then(function(result) {
                expect(result.errors).to.have.length(0);
                expect(result.warnings).to.have.length(0);
                // There should be an equal number of points for both statistics.
                let min_count = 0;
                let avg_count = 0;
                for(let point of result.sinks.text) {
                    validate_point(point, ['Minimum', 'Average']);
                    if (point.statistic === 'Minimum') {
                        min_count++;
                    } else {
                        avg_count++;
                    }
                }
                expect(min_count).to.equal(avg_count);
            });
        });

        it(' with -period to get greater aggregations', function() {
            let num_default_points;
            return check_juttle({
                program: 'read cloudwatch -last :1 hour: product="EC2" | view text'
            })
            .then(function(result) {
                expect(result.errors).to.have.length(0);
                expect(result.warnings).to.have.length(0);
                num_default_points = result.sinks.text.length;
            })
            .then(function() {
                return check_juttle({
                    program: 'read cloudwatch -last :1 hour: -period 3600 product="EC2" | view text'
                });
            })
            .then(function(result) {
                expect(result.errors).to.have.length(0);
                expect(result.warnings).to.have.length(0);

                // We don't check for precisely 1/60 the number of
                // points, as some metrics like status checks, etc.
                // won't be included, and some instances might have
                // detailed monitoring enabled, both of which affect
                // the totals. 1/10 should be a safe threshold.
                expect(result.sinks.text.length).to.be.below(num_default_points*0.1);
            });
        });
    });
});


