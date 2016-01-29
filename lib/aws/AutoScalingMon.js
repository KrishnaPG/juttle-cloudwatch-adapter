'use strict';
var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');

class AutoScalingMon extends AWSMon {

    constructor(options) {
        super(options);

        this._as_client = Promise.promisifyAll(new this._AWS.AutoScaling());

        // Maps from group name to most recently fetched information
        // about group.
        this._last_group_info = {};
    }

    //
    // PUBLIC METHODS
    //

    aws_product() {
        return AutoScalingMon.aws_product();
    }

    item_name() {
        return AutoScalingMon.item_name();
    }

    // Poll the AutoScaling API and return a list of events and metrics.

    poll(now) {
        this._now = now;
        this._logger.info('Polling AutoScaling Groups...');

        let cur_group_info = {};

        let list_groups_batch = (next_token) => {
            let opts = {};
            if (next_token) {
                opts = _.extend(opts, {NextToken: next_token});
            }

            return this._as_client.describeAutoScalingGroupsAsync(opts).then((value) => {
                for(let group of value.AutoScalingGroups) {

                    // One annoying thing about the returned results
                    // is that the list of instances for each group is
                    // not returned in a consistent order. So sort the
                    // instances by instance id, replacing the current
                    // list.
                    group.Instances = _.sortBy(group.Instances, 'InstanceId');

                    cur_group_info[group.AutoScalingGroupName] = group;
                }

                if (_.has(value.NextToken)) {
                    return list_groups_batch(value.NextToken);
                } else {
                    return Promise.resolve();
                }
            });
        };

        return list_groups_batch(undefined).then(() => {

            let groups = _.values(cur_group_info);

            let new_metrics = this.demographics(groups,
                                                function(group) {
                                                    return [{name: 'AutoScaling Desired Capacity',
                                                             category: group.DesiredCapacity},
                                                            {name: 'AutoScaling Current Group Size',
                                                             category: group.Instances.length},
                                                            {name: 'AutoScaling Health Check Type',
                                                             category: group.HealthCheckType}];
                                                });

            new_metrics.push(this.create_aggregate_metric('AutoScaling Group Count', groups.length));
            new_metrics.push(this.create_aggregate_metric('AutoScaling Group Total Size',
                                                          _.reduce(groups, (memo, group) => {
                                                              return memo + group.Instances.length;
                                                          }, 0)));
            new_metrics.push(this.create_aggregate_metric('AutoScaling Group Total Desired Capacity',
                                                          _.reduce(groups, (memo, group) => {
                                                              return memo + group.DesiredCapacity;
                                                          }, 0)));

            let new_events = [];

            if (_.keys(this._last_group_info).length !== 0) {
                new_events = this.changes('AutoScaling Group', cur_group_info, this._last_group_info);
            }

            this._last_group_info = cur_group_info;

            return {
                events: new_events,
                metrics: new_metrics
            };

        }).error((e) => {
            this._logger.error('Could not fetch information on AutoScaling Groups: ' + e);
            return {
                events: [],
                metrics: []
            };
        });
    }
}

AutoScalingMon.aws_product = function() {
    return 'AutoScaling';
};

AutoScalingMon.item_name = function() {
    return 'AutoScalingGroupName';
};

module.exports = AutoScalingMon;




