'use strict';
var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');

class CloudFrontMon extends AWSMon {
    constructor(options) {
        super(options);

        this._cf_client = Promise.promisifyAll(new this._AWS.CloudFront());

        // Maps from id to most recently fetched information about the
        // item.
        this._last_distribution_info = {};
    }

    //
    // PUBLIC METHODS
    //

    aws_product() {
        return CloudFrontMon.aws_product();
    }

    item_name() {
        return CloudFrontMon.item_name();
    }

    // Poll the CloudFront API and return a list of events and metrics.

    poll(now) {
        this._now = now;
        this._logger.info('Polling CloudFront Distributions...');

        let ids = [];

        let list_dists_batch = (next_marker) => {
            let opts = {};
            if (next_marker) {
                opts = _.extend(opts, {Marker: next_marker});
            }

            return this._cf_client.listDistributionsAsync(opts).then((value) => {

                for(let item of value.Items) {
                    ids.push(item.Id);
                }

                if (value.IsTruncated) {
                    return list_dists_batch(value.NextMarker);
                } else {
                    return Promise.resolve();
                }
            });
        };

        return list_dists_batch(undefined).then(() => {

            return Promise.map(ids, (id) => {
                return this._cf_client.getDistributionAsync({Id: id});
            }, {concurrency: 10});
        }).then((dists) => {

            let new_metrics = this.demographics(dists,
                                                function(dist) {
                                                    return [{name: 'CF Status',
                                                             category: dist.Status},
                                                            {name: 'CF Price Class',
                                                             category: dist.DistributionConfig.PriceClass},
                                                            {name: 'CF Enabled',
                                                             category: dist.DistributionConfig.Enabled}];
                                                });

            new_metrics.push(this.create_aggregate_metric('CF Distribution Count', dists.length));

            let new_events = [];

            let cur_distribution_info = {};

            for(let dist of dists) {
                cur_distribution_info[dist.Id] = dist;
            }

            if (_.keys(this._last_distribution_info).length !== 0) {
                new_events = this.changes('CF Distribution', cur_distribution_info, this._last_distribution_info);
            }

            this._last_distribution_info = cur_distribution_info;

            return {
                events: new_events,
                metrics: new_metrics
            };

        }).error((e) => {
            this._logger.error('Could not fetch information on CloudFront Distributions: ' + e);
            return {
                events: [],
                metrics: []
            };
        });
    }
}

CloudFrontMon.aws_product = function() {
    return 'CloudFront';
};

CloudFrontMon.item_name = function() {
    return 'DistributionId';
};

module.exports = CloudFrontMon;




