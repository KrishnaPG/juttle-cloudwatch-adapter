'use strict';
var AWSFactory = require('./aws/Factory');
var AdapterRead = require('juttle/lib/runtime/adapter-read');
var JuttleMoment = require('juttle/lib/moment/juttle-moment');
var errors = require('juttle/lib/errors');
var Promise = require('bluebird');
var _ = require('underscore');
var FilterAWSCompiler = require('./filter-aws-compiler');

class ReadAWS extends AdapterRead {
    static get timeRequired() { return true; }

    constructor(options, params) {
        super(options, params);

        this.logger.debug('intitialize', options, params);

        var allowed_options = AdapterRead.commonOptions.concat(['cloudwatch']);
        var unknown = _.difference(_.keys(options), allowed_options);

        if (unknown.length > 0) {
            throw new errors.compileError('RT-UNKNOWN-OPTION-ERROR',
                                          {proc: 'read aws', option: unknown[0]});
        }

        if (_.has(options, 'cloudwatch')) {
            this._cloudwatch = options.cloudwatch;
        } else {
            this._cloudwatch = true;
        }

        this._filter_search_expr = {
            products: AWSFactory.supported_products(),
            items: {}
        };

        if (params.filter_ast) {
            this.logger.debug('Filter ast: ', params.filter_ast);
            var compiler = new FilterAWSCompiler({
                cloudwatch: this._cloudwatch,
                supported_products: AWSFactory.supported_products()
            });
            this._filter_search_expr = compiler.compile(params.filter_ast);
            this.logger.debug('Filter expression: ', this._filter_search_expr);
        }

        this.logger.info('Enabled Products:', this._filter_search_expr.products);

        this._plugins =  _.map(this._filter_search_expr.products, (aws_product) => {
            return AWSFactory.create_aws_plugin(aws_product, this.logger);
        });

        // Take the set of aws products and for the enabled plugins
        // start monitoring the products in Cloudwatch.
        if (this._cloudwatch) {
            this._cloudwatch_plugin = AWSFactory.create_aws_plugin('CloudWatch', this.logger);
            for (var plugin of this._plugins) {
                this._cloudwatch_plugin.monitor_product(plugin.aws_product(), plugin.item_name());
            }

            // Add this to the plugin list now so we can call its
            // poll() method by looping over the plugin list.
            this._plugins.push(this._cloudwatch_plugin);

            // Take any specific items from the filter expresssion and
            // have the CloudWatch plugin monitor them.
            _.each(this._filter_search_expr.items, (item_ids, aws_product) => {
                for(var item_id of item_ids) {
                    this._cloudwatch_plugin.monitor_item(aws_product, AWSFactory.aws_item_name(aws_product), item_id);
                }
            });
        }
    }

    start() {
    }

    // XXX/mstemm ignoring limit/state for now
    read(from, to, limit, state) {

        this.logger.info("from=" + from + " to=" + to);

        var promises = _.map(this._plugins, (plugin) => {
            return plugin.poll(from);
        });

        return Promise.all(promises).then((results) => {
            let points = [];

            // XXX/mstemm may need to sort all the points by time. But
            // for now, they all use the same now.

            for(var result of results) {
                if (result) {
                    if (result.metrics && result.metrics.length > 0) {
                        points = points.concat(result.metrics);
                    }
                    if (result.events && result.events.length > 0) {
                        points = points.concat(result.events);
                    }
                }
            }

            let ret =  {
                points: points,
                readEnd: to
            };
            return ret;
        });
    }
}

function init(config) {
    AWSFactory.init(config);
}

module.exports = {
    init: init,
    read: ReadAWS
};

