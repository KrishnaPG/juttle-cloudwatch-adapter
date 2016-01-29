'use strict';
var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');
var JuttleMoment = require('juttle/lib/moment/juttle-moment');

class CloudWatchMon extends AWSMon {

    constructor(options) {
        super(options);

        this._cw_client = Promise.promisifyAll(new this._AWS.CloudWatch());
        this._plugins = [];
        this._period = options.period;
        this._statistics = options.statistics;

        this._skip_metrics = ['StatusCheckFailed'];

        this._nonzero_only_metrics = ['StatusCheckFailed_System', 'StatusCheckFailed_Instance', 'StatusCheckFailed'];

        // This is hash mapping from aws product name to an object
        // containing the product name, item name, and list of item
        // ids. If the list of item ids is empty, fetch cloudwatch
        // metrics for all items for the given product.
        this._products = {};
    }

    // Poll the CloudWatch API and return a list of events and metrics.
    poll(from, to) {
        this._logger.info('Polling CloudWatch for ' + _.keys(this._products).length + ' AWS Products');

        return Promise.map(_.values(this._products), (product) => {
            return this._get_metrics_for(product, from, to)
            .catch((e) => {
                this._logger.error('Could not fetch information from CloudWatch for product ' + product + ': ' + e);
                return [];
            });
        }).then((plugin_results) => {
            return {
                events: [],
                metrics: _.sortBy(_.flatten(plugin_results), 'time')
            };
        }).catch((e) => {
            this._logger.error('Could not fetch information from CloudWatch:' + e);
            return {
                events: [],
                metrics: []
            };
        });

    }

    //
    // PROTECTED METHODS
    //

    // Start monitoring the specified product by watching items with
    // the specified item name.
    monitor_product(aws_product, item_name) {
        this._products[aws_product] = {
            aws_product: aws_product,
            item_name: item_name,
            item_ids: []
        };
    }

    // Start monitoring the specified item, which is identified by the
    // specified item_name.
    monitor_item(aws_product, item_name, item_id) {
        if (! _.has(this._products, aws_product)) {
            this.monitor_product(aws_product, item_name);
        }

        this._products[aws_product].item_ids.push(item_id);
    }

    create_metric(options) {
        let metric_type = 'AWS CloudWatch';

        let metric = {
            time: options.time,
            aws_product: options.aws_product,
            namespace: options.namespace,
            metric_type: options.metric_type,
            name: options.name,
            item: options.item,
            value: options.value
        };

        return metric;
    }

    //
    // PRIVATE METHODS
    //

    // Get all metrics for all items having the specified item
    // name. This is done by an initial call to listMetrics to find
    // the metrics that exist for the items, and a second call to
    // getMetricStatistics to get the values for the metrics.

    _get_metrics_for(product, from, to) {
        // If there is not an explicit list of items to track for the
        // given product, the dimension is only the item name
        // (e.g. EC2InstanceId). Otherwise, there are multiple
        // dimensions, one for each item.

        let global_opts = {
            Dimensions: [ {
                Name: product.item_name
            } ]
        };

        if (product.item_ids.length > 0) {
            global_opts = {
                Dimensions: _.map(product.item_ids, (item_id) => {
                    return {
                        Name: product.item_name,
                        Value: item_id
                    };
                })
            };
        }

        // listMetrics will give us all the metrics for each item
        // name, but not the actual values for any metric. We fetch
        // the metrics in a second call.

        let metrics = [];

        let list_metrics_batch = (next_token) => {
            let opts = {};
            _.extend(opts, global_opts);
            if (next_token) {
                opts = _.extend(opts, {NextToken: next_token});
            }
            return this._cw_client.listMetricsAsync(opts).then((value) => {

                let keep = _.filter(value.Metrics, (metric) => {
                    return (! _.contains(this._skip_metrics, metric.MetricName));
                });
                metrics = metrics.concat(keep);

                if (value.NextToken) {
                    return list_metrics_batch(value.NextToken);
                } else {
                    return Promise.resolve();
                }
            });
        };

        return list_metrics_batch(undefined).then(() => {
            return Promise.map(metrics, (metric) => {
                let opts = {MetricName: metric.MetricName,
                            Namespace: metric.Namespace,
                            Dimensions: metric.Dimensions,
                            StartTime: from.seconds(),
                            EndTime: to.seconds(),
                            Period: this._period,
                            Statistics: this._statistics};
                return this._cw_client.getMetricStatisticsAsync(opts).then((value) => {
                    // When multiple statistics are given, both are
                    // included in each datapoint. Explode the
                    // datapoint into multiple points, one for each
                    // statistic. Also split the propery 'Statistic: value'
                    // (e.g. 'Average: 12') to two properties
                    // (e.g. 'Statistic: Average, value: 12')

                    let points = [];

                    for(let statistic of this._statistics) {
                        points = points.concat(_.map(value.Datapoints, (datapoint) => {

                            // Build a juttle-style point from the cloudwatch datapoint.
                            return {
                                time: JuttleMoment.parse(datapoint.Timestamp),
                                metric_type: 'AWS CloudWatch',
                                aws_product: product.aws_product,
                                namespace: metric.Namespace,
                                name: metric.MetricName,
                                item: metric.Dimensions[0].Value,
                                statistic: statistic,
                                value: datapoint[statistic],
                                units: datapoint.Unit
                            };
                        }));
                    }

                    // For any metrics in _nonzero_only_metrics, only report the
                    // metric if the value is non-zero.
                    if (_.contains(this._nonzero_only_metrics, metric.MetricName)) {
                        points = _.reject(points, (point) => {
                            return point.value === 0;
                        });
                    }

                    return points;
                });
            }, {concurrency: 10});
        }).then((results) => {
            let flattened = _.flatten(results);
            return flattened;
        });
    }

}

module.exports = CloudWatchMon;




