'use strict';
var AWS = require('aws-sdk');
var CloudWatchMon = require('./CloudWatchMon');
var AdapterRead = require('juttle/lib/runtime/adapter-read');
var errors = require('juttle/lib/errors');
var _ = require('underscore');
var FilterCloudWatchCompiler = require('./filter-cloudwatch-compiler');

class ReadCloudWatch extends AdapterRead {
    static get timeRequired() { return true; }

    constructor(options, params) {
        super(options, params);

        this.logger.debug('intitialize', options, params);

        var allowed_options = AdapterRead.commonOptions.concat(['period', 'statistics']);
        var unknown = _.difference(_.keys(options), allowed_options);

        if (unknown.length > 0) {
            throw new errors.compileError('RT-UNKNOWN-OPTION-ERROR',
                                          {proc: 'read aws', option: unknown[0]});
        }

        this._period = 60;
        if (_.has(options, 'period')) {
            this.period = options.period;
        }

        this._statistics = ['Average'];
        if (_.has(options, 'statistics')) {
            this.statistics = options.statistics;
        }

        let products = {
            EC2: 'InstanceId',
            EBS: 'VolumeId',
            ELB: 'LoadBalancerName',
            RDS: 'DBInstanceIdentifier',
            CloudFront: 'DistributionId',
            AutoScaling: 'AutoScalingGroupName',
            ElastiCache: 'CacheClusterId',
            Lambda: 'FunctionName'
        };

        // Create a object mapping from product to (empty) list of ids.

        this._filter_search_expr = {};
        for (let aws_product of _.keys(products)) {
            this._filter_search_expr[aws_product] = [];
        }

        if (params.filter_ast) {
            this.logger.debug('Filter ast: ', params.filter_ast);
            var compiler = new FilterCloudWatchCompiler({
                supported_products: _.keys(products)
            });
            this._filter_search_expr = compiler.compile(params.filter_ast);
            this.logger.debug('Filter expression: ', this._filter_search_expr);
        }

        // Add the item name and product name to the filter expression.
        this._filter_search_expr = _.mapObject(this._filter_search_expr, (item_ids, aws_product) => {
            return {
                aws_product: aws_product,
                item_name: products[aws_product],
                item_ids: item_ids
            };
        });

        this.logger.info('Enabled Products:', _.keys(this._filter_search_expr));

        // Take the set of aws products and for the enabled plugins
        // start monitoring the products in Cloudwatch.
        this._cloudwatch = new CloudWatchMon({AWS: AWS,
                                              logger: this.logger,
                                              period: this._period,
                                              statistics: this._statistics,
                                              monitor: this._filter_search_expr});
    }

    start() {
    }

    // XXX/mstemm ignoring limit/state for now
    read(from, to, limit, state) {

        this.logger.info('from=' + from + ' to=' + to);

        return this._cloudwatch.poll(from, to).then((points) => {
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
}

module.exports = {
    init: init,
    read: ReadCloudWatch
};

