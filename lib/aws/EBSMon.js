'use strict';
var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');

class EBSMon extends AWSMon {

    constructor(options) {
        super(options);

        this._ec2_client = Promise.promisifyAll(new this._AWS.EC2());

        // Maps from volume id to most recently fetched information
        // about volume
        this._last_volume_info = {};
    }

    //
    // PUBLIC METHODS
    //

    aws_product() {
        return EBSMon.aws_product();
    }

    item_name() {
        return EBSMon.item_name();
    }

    // Poll the EC2 API and return a list of events and metrics.

    poll(now) {
        this._now = now;
        this._logger.info('Polling EBS Volumes...');

        // We do two calls. The first describes the volumes to get
        // demographic/aggregate information, track changes, and pass
        // lists of voumes to CloudWatch. The second call gets the
        // specific volume status of each volume and emits any non-ok
        // status as a metric.
        return this._ec2_client.describeVolumesAsync({}).then((value) => {

            var cur_volume_info = {};

            for(let volume of value.Volumes) {
                cur_volume_info[volume.VolumeId] = volume;
            }

            var volumes = _.values(cur_volume_info);

            var new_metrics = this.demographics(volumes,
                                                function(volume) {
                                                    return [{name: 'EBS Volume Type',
                                                             category: volume.VolumeType},
                                                            {name: 'EBS State',
                                                             category: volume.State}];
                                                });

            new_metrics.push(this.create_aggregate_metric('EBS Volume Count', volumes.length));
            new_metrics.push(this.create_aggregate_metric('EBS Volume Total Size',
                                                          _.reduce(volumes, (memo, vol) => {
                                                              return memo + vol.Size;
                                                          }, 0)));
            new_metrics.push(this.create_aggregate_metric('EBS Volume Total Iops',
                                                          _.reduce(volumes, (memo, vol) => {
                                                              return memo + (vol.Iops ? vol.Iops : 0);
                                                          }, 0)));

            var new_events = [];

            if (_.keys(this._last_volume_info).length !== 0) {
                new_events = this.changes('EBS Volume', cur_volume_info, this._last_volume_info);
            }

            this._last_volume_info = cur_volume_info;

            return {
                events: new_events,
                metrics: new_metrics
            };
        }).then((events_metrics) => {
            return this._ec2_client.describeVolumeStatusAsync({}).then( (value) => {
                var new_metrics = this.demographics(value.VolumeStatuses,
                                                    function(volume) {
                                                        return [{name: 'EBS Volume Status',
                                                                 category: volume.VolumeStatus.Status}];
                                                    });
                events_metrics.metrics = events_metrics.metrics.concat(new_metrics);

                for(let volume of value.VolumeStatuses) {
                    // We only report metrics when the status is something other than 'ok'
                    if (volume.VolumeStatus.Status !== 'ok') {
                        events_metrics.metrics.push(this.create_metric('AWS Metric', 'VolumeStatusErrors', 1, {status: volume.VolumeStatus.Status, item: volume.VolumeId}));
                    }
                }
                return events_metrics;
            });
        }).error((e) => {
            this._logger.error('Could not fetch information on EBS Volumes: ' + e);
            return {
                events: [],
                metrics: []
            };
        });
    }
}

EBSMon.aws_product = function() {
    return 'EBS';
};

EBSMon.item_name = function() {
    return 'VolumeId';
};

module.exports = EBSMon;




