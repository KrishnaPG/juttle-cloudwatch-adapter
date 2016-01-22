var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');

var AutoScalingMon = AWSMon.extend({

    initialize: function(options) {
        var self = this;

        self._aws_product = "AutoScaling";
        self._item_name = 'AutoScalingGroupName';

        self._as_client = Promise.promisifyAll(new self._AWS.AutoScaling());

        // Maps from group name to most recently fetched information
        // about group.
        self._last_group_info = {};
    },

    //
    // PUBLIC METHODS
    //

    // Poll the AutoScaling API and return a list of events and metrics to
    // send to the Jut Data Node

    poll: function() {
        var self = this;

        self._logger.info("Polling AutoScaling Groups...");

        var now = new Date();

        var cur_group_info = {};

        var list_groups_batch = function (next_token) {
            var opts = {};
            if (next_token) {
                opts = _.extend(opts, {NextToken: next_token});
            }

            return self._as_client.describeAutoScalingGroupsAsync(opts).then(function(value) {
                value.AutoScalingGroups.forEach(function(group) {

                    // One annoying thing about the returned results
                    // is that the list of instances for each group is
                    // not returned in a consistent order. So sort the
                    // instances by instance id, replacing the current
                    // list.
                    group.Instances = _.sortBy(group.Instances, 'InstanceId');

                    self.remember_aws_item(now, self._item_name, group.AutoScalingGroupName);
                    cur_group_info[group.AutoScalingGroupName] = group;
                });

                if (_.has(value.NextToken)) {
                    return list_groups_batch(value.NextToken);
                }
            });
        };

        return list_groups_batch(undefined).then(function() {

            var groups = _.values(cur_group_info);

            var new_metrics = self.demographics(groups,
                                                function(group) {
                                                    return [{name: "AutoScaling Desired Capacity",
                                                             category: group.DesiredCapacity},
                                                            {name: "AutoScaling Current Group Size",
                                                             category: group.Instances.length},
                                                            {name: "AutoScaling Health Check Type",
                                                             category: group.HealthCheckType}];
                                                });

            new_metrics.push(self.create_aggregate_metric("AutoScaling Group Count", groups.length));
            new_metrics.push(self.create_aggregate_metric("AutoScaling Group Total Size",
                                                          _.reduce(groups, function(memo, group) {
                                                              return memo + group.Instances.length;
                                                          }, 0)));
            new_metrics.push(self.create_aggregate_metric("AutoScaling Group Total Desired Capacity",
                                                          _.reduce(groups, function(memo, group) {
                                                              return memo + group.DesiredCapacity;
                                                          }, 0)));

            var new_events = [];

            if (_.keys(self._last_group_info).length !== 0) {
                new_events = self.changes("AutoScaling Group", cur_group_info, self._last_group_info);
            }

            self._last_group_info = cur_group_info;

            self.age_aws_items(now);

            return {
                events: new_events,
                metrics: new_metrics
            };

        }).error(function(e) {
            self._logger.error("Could not fetch information on AutoScaling Groups: " + e);
            return {
                events: [],
                metrics: []
            };
        });
    }
});

module.exports = AutoScalingMon;




