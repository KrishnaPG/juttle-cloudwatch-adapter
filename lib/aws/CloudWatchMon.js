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
    },

    //
    // PUBLIC METHODS
    //

    // Tell this plugin about the other plugins. It calls the other plugins
    // get_aws_items() method to get lists of items to track
    add_plugins: function(plugins) {
        var self = this;

        self._plugins = plugins;
    },

    // Poll the CloudWatch API and return a list of events and metrics to
    // send to the Jut Data Node

    poll: function() {
        var self = this;

        self._logger.info("Polling CloudWatch for " + self._plugins.length + " other plugins");

        return Promise.map(self._plugins, function(plugin) {

            var items = plugin.get_aws_items();

            if (items.length === 0) {
                self._logger.info("No items for plugin " + plugin.aws_product() + ", skipping");
                return [];
            }

            return Promise.map(items, function(item) {
                return self._get_metrics_for(plugin.aws_product(), [item]);
            }).then(function(metrics_arrs) {
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
    create_metric: function(aws_product, namespace, name, item, value) {
        var self = this;

        var metric_type = "AWS CloudWatch";

        var metric = {
            time: new Date().toISOString(),
            aws_product: aws_product,
            namespace: namespace,
            source_type: "metric",
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

    // Get all metrics for the specified item. This is done by an
    // initial call to listMetrics to find the metrics that exist for
    // the item, and a second call to getMetricStatistics to get the
    // values for the metrics.

    _get_metrics_for: function(aws_product, item) {
        var self = this;

        var global_opts = {
            Dimensions: item
        };

        // listMetrics will give us all the metrics for each item, but
        // not the actual values for any metric. We fetch the metrics
        // in a second call.

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




