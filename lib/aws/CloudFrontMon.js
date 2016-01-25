var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');

var CloudFrontMon = AWSMon.extend({

    initialize: function(options) {
        var self = this;

        self._aws_product = "CloudFront";
        self._item_name = 'DistributionId';

        self._cf_client = Promise.promisifyAll(new self._AWS.CloudFront());

        // Maps from id to most recently fetched information about the
        // item.
        self._last_distribution_info = {};
    },

    //
    // PUBLIC METHODS
    //

    // Poll the CloudFront API and return a list of events and metrics to
    // send to the Jut Data Node

    poll: function() {
        var self = this;

        self._logger.info("Polling CloudFront Distributions...");

        var now = new Date();

        var ids = [];

        var list_dists_batch = function(next_marker) {
            var opts = {};
            if (next_marker) {
                opts = _.extend(opts, {Marker: next_marker});
            }

            return self._cf_client.listDistributionsAsync(opts).then(function(value) {

                value.Items.forEach(function(item) {
                    ids.push(item.Id);
                });

                if (value.IsTruncated) {
                    return list_dists_batch(value.NextMarker);
                }
            });
        };

        return list_dists_batch(undefined).then(function() {

            return Promise.map(ids, function(id) {
                return self._cf_client.getDistributionAsync({Id: id});
            }, {concurrency: 10});
        }).then(function(dists) {

            var new_metrics = self.demographics(dists,
                                                function(dist) {
                                                    return [{name: "CF Status",
                                                             category: dist.Status},
                                                            {name: "CF Price Class",
                                                             category: dist.DistributionConfig.PriceClass},
                                                            {name: "CF Enabled",
                                                             category: dist.DistributionConfig.Enabled}];
                                                });

            new_metrics.push(self.create_aggregate_metric("CF Distribution Count", dists.length));

            var new_events = [];

            var cur_distribution_info = {};

            dists.forEach(function(dist) {
                cur_distribution_info[dist.Id] = dist;
            });

            if (_.keys(self._last_distribution_info).length !== 0) {
                new_events = self.changes("CF Distribution", cur_distribution_info, self._last_distribution_info);
            }

            self._last_distribution_info = cur_distribution_info;

            return {
                events: new_events,
                metrics: new_metrics
            };

        }).error(function(e) {
            self._logger.error("Could not fetch information on CloudFront Distributions: " + e);
            return {
                events: [],
                metrics: []
            };
        });
    }
});

module.exports = CloudFrontMon;




