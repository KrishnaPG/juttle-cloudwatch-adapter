'use strict';
var Promise = require('bluebird');
var _ = require('underscore');

/* global JuttleAdapterAPI */
var JuttleMoment = JuttleAdapterAPI.types.JuttleMoment;

class CloudWatchMon {

    constructor(options) {

        this._AWS = options.AWS;
        this._logger = options.logger;

        this._products = options.products;

        this._cw_client = Promise.promisifyAll(new this._AWS.CloudWatch());
        this._period = options.period;
        this._statistics = options.statistics;

        this._skip_metrics = ['StatusCheckFailed'];

        this._nonzero_only_metrics = ['StatusCheckFailed_System', 'StatusCheckFailed_Instance', 'StatusCheckFailed'];

        // This is an list of conditions, returned by
        // FilterCloudwatchCompiler. Each item in the list specifies a
        // product, set of items, and/or set of metrics for which to
        // fetch CloudWatch information.
        this._conditions = options.conditions;
    }

    // Poll the CloudWatch API and return a list of events and metrics.
    poll(from, to) {
        this._logger.debug('Polling CloudWatch for ' + this._conditions.length + ' Conditons');
        this._logger.debug('Polling details: ', this._conditions);

        return Promise.map(this._conditions, (cond) => {
            return this._get_metrics_for(cond, from, to);
        }).then((results) => {
            return _.sortBy(_.flatten(results), 'time');
        }).catch((e) => {
            this._logger.error('Could not fetch information from CloudWatch: ' + e);
            throw e;
        });

    }

    //
    // PRIVATE METHODS
    //

    // Get all metrics for all items having the specified item
    // name. This is done by an initial call to listMetrics to find
    // the metrics that exist for the items, and a second call to
    // getMetricStatistics to get the values for the metrics.

    _get_metrics_for(cond, from, to) {
        // If there is not an explicit list of items to track for the
        // given product, the dimension is only the item name
        // (e.g. EC2InstanceId). Otherwise, there are multiple
        // dimensions, one for each item.

        let global_opts = {
            Dimensions: [ {
                Name: this._products[cond.product]
            } ]
        };

        if (cond.item.length > 0) {
            global_opts = {
                Dimensions: _.map(cond.item, (item_id) => {
                    return {
                        Name: this._products[cond.product],
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
                }
            });
        };

        return list_metrics_batch(undefined).then(() => {

            this._logger.debug(`Found ${metrics.length} metrics`);

            // If the list of metrics in the condition is non-empty, only include those metrics.
            if (cond.metric.length > 0) {
                metrics = _.filter(metrics, (metric) => {
                    return _.contains(cond.metric, metric.MetricName);
                });
                this._logger.debug(`Filtered down to ${metrics.length} metrics`);
            }

            this._logger.debug(`Found ${metrics.length} metrics x dimensions to fetch for ${cond.product}`);

            return Promise.map(metrics, (metric) => {
                // Occasionally the Dimensions array will be empty. In
                // this case, return an empty array of point.
                if (metric.Dimensions.length === 0) {
                    return [];
                }

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
                                product: cond.product,
                                namespace: metric.Namespace,
                                name: metric.MetricName,
                                dimension: metric.Dimensions[0].Name,
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
        });
    }

}

module.exports = CloudWatchMon;




