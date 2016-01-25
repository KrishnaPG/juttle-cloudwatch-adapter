var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');

var CloudWatchMon = AWSMon.extend({

    initialize: function(options) {
        var self = this;

        self._cw_client = Promise.promisifyAll(new self._AWS.CloudWatch());
        self._plugins = [];

        self._skip_metrics = ["StatusCheckFailed"];

        self._nonzero_only_metrics = ["StatusCheckFailed_System", "StatusCheckFailed_Instance", "StatusCheckFailed"];

        // This is a hash mapping from aws product to item name (e.g. "EC2" -> "InstanceId")
        self._products = {};
    },

    // Poll the CloudWatch API and return a list of events and metrics.

    poll: function() {
        var self = this;

        self._logger.info("Polling CloudWatch for " + _.keys(self._products).length + " AWS Products");

        return Promise.map(_.keys(self._products), function(aws_product) {

            return self._get_metrics_for(aws_product, self._products[aws_product])
            .then(function(metrics_arrs) {
                return _.flatten(metrics_arrs);
            }).error(function(e) {
                self._logger.error("Could not fetch information from CloudWatch: " + e);
                return [];
            });
        }).then(function(plugin_results) {
            return {
                events: [],
                metrics: _.flatten(plugin_results)
            };
        });
    },

    //
    // PROTECTED METHODS
    //

    // Start monitoring the specified product by watching items with
    // the specified item name.
    monitor_product: function(aws_product, item_name) {
        var self = this;

        self._products[aws_product] = item_name;
    },

    create_metric: function(aws_product, namespace, name, item, value) {
        var self = this;

        var metric_type = "AWS CloudWatch";

        var metric = {
            time: new Date().toISOString(),
            aws_product: aws_product,
            namespace: namespace,
            metric_type: metric_type,
            name: name,
            item: item,
            value: value
        };

        return metric;
    },

    //
    // PRIVATE METHODS
    //

    // Get all metrics for all items having the specified item
    // name. This is done by an initial call to listMetrics to find
    // the metrics that exist for the items, and a second call to
    // getMetricStatistics to get the values for the metrics.

    _get_metrics_for: function(aws_product, item_name) {
        var self = this;

        var global_opts = {
            Dimensions: [ {
                Name: item_name
            } ]
        };

        // listMetrics will give us all the metrics for each item
        // name, but not the actual values for any metric. We fetch
        // the metrics in a second call.

        var metrics = [];

        var list_metrics_batch = function(next_token) {
            var opts = {};
            _.extend(opts, global_opts);
            if (next_token) {
                opts = _.extend(opts, {NextToken: next_token});
            }
            return self._cw_client.listMetricsAsync(opts).then(function(value) {

                var keep = _.filter(value.Metrics, function(metric) {
                    return (! _.contains(self._skip_metrics, metric.MetricName));
                });
                metrics = metrics.concat(keep);

                if (value.NextToken) {
                    list_metrics_batch(value.NextToken);
                }
            });
        };

        return list_metrics_batch(undefined).then(function() {

            return Promise.map(metrics, function(metric) {
                var EndTime = Math.ceil(Date.now() / 1000);
                var StartTime = EndTime - 300;

                var opts = {MetricName: metric.MetricName,
                            Namespace: metric.Namespace,
                            Dimensions: metric.Dimensions,
                            StartTime: StartTime,
                            EndTime: EndTime,
                            Period: 300,
                            Statistics: ['Average']};

                return self._cw_client.getMetricStatisticsAsync(opts).then(function(value) {
                    // We skip metrics where there are no actual datapoints.
                    if (value.Datapoints.length === 0) {
                        return {};
                    } else {
                        // For any metrics in _nonzero_only_metrics, only report the
                        // metric if the value is non-zero.
                        if (_.contains(self._nonzero_only_metrics, metric.MetricName) &&
                            value.Datapoints[0].Average === 0) {
                            return {};
                        } else {
                            return _.extend(value, {
                                namespace: metric.Namespace,
                                name: metric.MetricName,
                                item: metric.Dimensions[0].Value
                            });
                        }
                    }
                });
            }, {concurrency: 10});
        }).then(function(results) {
            var metrics = _.chain(results).filter(function(result) {
                return _.has(result, "name");
            }).map(function(result) {
                return self.create_metric(aws_product, result.namespace, result.name, result.item, result.Datapoints[0].Average);
            }).value();

            return metrics;
        });
    }

});

module.exports = CloudWatchMon;




