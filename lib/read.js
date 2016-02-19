'use strict';
var AWS = require('aws-sdk');
var CloudWatchMon = require('./CloudWatchMon');
var AdapterRead = require('juttle/lib/runtime/adapter-read');
var errors = require('juttle/lib/errors');
var _ = require('underscore');
var FilterCloudWatchCompiler = require('./filter-cloudwatch-compiler');
var JuttleMoment = require('juttle/lib/moment/juttle-moment');

// By default, if a read command contains an -every less than 5
// minutes, the adapter logs a warning, and if a read command contains
// an -every less than 1 minute, the adapter throws an error.
//
// These options, which can be specified in the adapter config,
// disable these warnings/errors.

var disable_every_warnings = false;
var disable_every_errors = false;

// The products for which this adapter reads CloudWatch information,
// and for each product the item name used by the Cloudwatch APIs for
// that product.
const PRODUCTS = {
    EC2: 'InstanceId',
    EBS: 'VolumeId',
    ELB: 'LoadBalancerName',
    RDS: 'DBInstanceIdentifier',
    CloudFront: 'DistributionId',
    AutoScaling: 'AutoScalingGroupName',
    ElastiCache: 'CacheClusterId',
    Lambda: 'FunctionName'
};

class ReadCloudWatch extends AdapterRead {
    periodicLiveRead() { return true;}

    defaultTimeRange() {
        return {
            from: this.params.now.subtract(JuttleMoment.duration(10, 'm')),
            to: this.params.now
        };
    }

    allowedOptions() {
        return AdapterRead.commonOptions().concat(['period', 'statistics']);
    }

    constructor(options, params) {
        super(options, params);

        this.logger.debug('initialize', options, params);

        // Don't allow specifying an -every less than 1
        // minute. CloudWatch metrics are aggregated no more
        // frequently than once a minute, so an -every less than 1
        // minute will never read anything, as each read will return
        // nothing but advance the from time.

        if (this.options.every &&
            this.options.every.lt(JuttleMoment.duration(1, 'm')) &&
            ! disable_every_errors) {
            throw new errors.compileError('RT-ADAPTER-UNSUPPORTED-TIME-OPTION',
                                          {proc: 'read cloudwatch', option: 'every',
                                           message: '-every can not be less than 1 minute'});
        }

        this._period = 60;
        if (_.has(options, 'period')) {
            this._period = options.period;
        }

        this._statistics = ['Average'];
        if (_.has(options, 'statistics')) {
            this._statistics = options.statistics;
        }

        // Create a object mapping from product to (empty) list of ids.

        this._filter_search_expr = _.map(PRODUCTS, (value, key) => {
            return {
                product: key,
                item: [],
                metric: []
            };
        });

        if (params.filter_ast) {
            this.logger.debug('Filter ast: ', params.filter_ast);
            var compiler = new FilterCloudWatchCompiler({
                supported_products: _.keys(PRODUCTS)
            });
            this._filter_search_expr = compiler.compile(params.filter_ast);
            this.logger.debug('Filter expression: ', this._filter_search_expr);
        }

        this._cloudwatch = new CloudWatchMon({AWS: AWS,
                                              products: PRODUCTS,
                                              logger: this.logger,
                                              period: this._period,
                                              statistics: this._statistics,
                                              conditions: this._filter_search_expr});
    }

    start() {
        // By default CloudWatch delays metrics by 5 minutes, so if
        // someone does live reads with an -every less than 5 minutes
        // and is using the default CloudWatch metrics, they won't
        // actually read anything, as each read will return nothing
        // but advance the from time. To help make this pitfall
        // clear, emit a warning if -every is set to less than 5
        // minutes.
        if (this.options.every &&
            this.options.every.lt(JuttleMoment.duration(5, 'm')) &&
            ! disable_every_warnings) {
            this.trigger('warning', {message: '-every of < 5 minutes may miss CloudWatch metrics aggregated on 5 minute intervals'});
        }
    }

    // XXX/mstemm ignoring limit/state for now
    read(from, to, limit, state) {

        return this._cloudwatch.poll(from, to).then((points) => {
            this.logger.debug(`Returning ${points.length} points`);
            let ret =  {
                points: points,
                readEnd: to
            };
            return ret;
        });
    }
}

function init(config) {
    AWS.config.update({
        accessKeyId: config.access_key,
        secretAccessKey: config.secret_key,
        region: config.region
    });

    if (_.has(config, 'disable_every_warnings')) {
        disable_every_warnings = config.disable_every_warnings;
    }

    if (_.has(config, 'disable_every_errors')) {
        disable_every_errors = config.disable_every_errors;
    }
}

module.exports = {
    init: init,
    read: ReadCloudWatch
};

