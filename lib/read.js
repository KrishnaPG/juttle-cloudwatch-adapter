var AWSFactory = require('./aws/Factory');
var Juttle = require('juttle/lib/runtime').Juttle;
var JuttleMoment = require('juttle/lib/moment/juttle-moment');
var Promise = require('bluebird');
var _ = require('underscore');
var FilterAWSCompiler = require('./filter-aws-compiler');

var Read = Juttle.proc.source.extend({
    procName: 'read aws',

    initialize: function(options, params, location, program) {

        var self = this;

        self.logger.debug('intitialize', options, params);

        var time_related_options = ['from', 'to', 'last'];
        var allowed_options = time_related_options.concat(['cloudwatch']);
        var unknown = _.difference(_.keys(options), allowed_options);

        if (unknown.length > 0) {
            throw self.compile_error('RT-UNKNOWN-OPTION-ERROR',
                                     {proc: 'read aws', option: unknown[0]});
        }

        if (_.has(options, 'cloudwatch')) {
            self._cloudwatch = options.cloudwatch;
        } else {
            self._cloudwatch = true;
        }

        // One of 'from', 'to', or 'last' must be present.
        // var opts = _.intersection(_.keys(options), time_related_options);
        // if (opts.length === 0) {
        //     throw self.compile_error('RT-MISSING-TIME-RANGE-ERROR');
        // }

        // If 'from'/'to' are present, 'last' can not be present.
        if ((_.has(options, 'from') || _.has(options, 'to')) &&
            _.has(options, 'last')) {
            throw self.compile_error('RT-LAST-FROM-TO-ERROR');
        }

        // 'from' must be before 'to'
        if (_.has(options, 'from') && _.has(options, 'to') &&
            options.from > options.to) {
            throw self.compile_error('RT-TO-FROM-MOMENT-ERROR');
        }

        // If 'last' is specified, set appropriate 'from'/'to'
        if (_.has(options, 'last')) {
            self.from = program.now.subtract(options.last);
            self.to = program.now;
        } else {
            // Initialize from/to if necessary.
            self.from = options.from || program.now;
            self.to = options.to || program.now;
        }

        self._filter_search_expr = {
            products: AWSFactory.supported_products(),
            items: {}
        };

        if (params.filter_ast) {
            self.logger.debug('Filter ast: ', params.filter_ast);
            var compiler = new FilterAWSCompiler({
                location: location,
                cloudwatch: self._cloudwatch,
                supported_products: AWSFactory.supported_products()
            });
            self._filter_search_expr = compiler.compile(params.filter_ast);
            self.logger.debug('Filter expression: ', self._filter_search_expr);
        }

        self.logger.info('Enabled Products:', self._filter_search_expr.products);

        self._plugins =  _.map(self._filter_search_expr.products, function(aws_product) {
            return AWSFactory.create_aws_plugin(aws_product, self.logger);
        });

        // Take the set of aws products and for the enabled plugins
        // start monitoring the products in Cloudwatch.
        if (self._cloudwatch) {
            self._cloudwatch_plugin = AWSFactory.create_aws_plugin('CloudWatch', self.logger);
            self._plugins.forEach(function(plugin) {
                self._cloudwatch_plugin.monitor_product(plugin.aws_product(), plugin.item_name());
            });

            // Add this to the plugin list now so we can call its
            // poll() method by looping over the plugin list.
            self._plugins.push(self._cloudwatch_plugin);

            // Take any specific items from the filter expresssion and
            // have the CloudWatch plugin monitor them.
            _.each(self._filter_search_expr.items, function(item_ids, aws_product) {
                item_ids.forEach(function(item_id) {
                    self._cloudwatch_plugin.monitor_item(aws_product, AWSFactory.aws_item_name(aws_product), item_id);
                });
            });
        }

        self._should_stop = false;
    },

    start: function() {
        var self = this;

        self._poll();
    },

    teardown: function() {
        var self = this;

        self._should_stop = true;
    },

    // Non-public methods below here.
    _poll: function () {
        var self = this;

        var promises = _.map(self._plugins, function(plugin) {
            return plugin.poll();
        });

        var now = new JuttleMoment();

        return Promise.all(promises).then(function(results) {
            results.forEach(function(result) {
                if (result) {
                    if (result.metrics && result.metrics.length > 0) {
                        self.emit(result.metrics);
                    }
                    if (result.events && result.events.length > 0) {
                        self.emit(result.events);
                    }
                }
            });
        }).error(function(err) {
            self.logger.error('Could not poll AWS', err);
        }).finally(function() {
            if (! self._should_stop) {
                var next_poll = now.add(JuttleMoment.duration(30, 's'));
                self.program.scheduler.schedule(next_poll.unixms(), function() {
                    self._poll();
                });
            }
        });
    }
});

function init(config) {
    AWSFactory.init(config);
}

module.exports = {
    init: init,
    read: Read
};

