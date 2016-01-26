var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');

var EBSMon = AWSMon.extend({

    initialize: function(options) {
        var self = this;

        self._ec2_client = Promise.promisifyAll(new self._AWS.EC2());

        // Maps from volume id to most recently fetched information
        // about volume
        self._last_volume_info = {};
    },

    //
    // PUBLIC METHODS
    //

    aws_product: function() {
        return EBSMon.aws_product();
    },

    item_name: function() {
        return EBSMon.item_name();
    },

    // Poll the EC2 API and return a list of events and metrics to
    // send to the Jut Data Node

    poll: function() {
        var self = this;

        self._logger.info("Polling EBS Volumes...");

        var now = new Date();

        // We do two calls. The first describes the volumes to get
        // demographic/aggregate information, track changes, and pass
        // lists of voumes to CloudWatch. The second call gets the
        // specific volume status of each volume and emits any non-ok
        // status as a metric.
        return self._ec2_client.describeVolumesAsync({}).then(function(value) {

            var cur_volume_info = {};

            value.Volumes.forEach(function(volume) {
                cur_volume_info[volume.VolumeId] = volume;
            });

            var volumes = _.values(cur_volume_info);

            var new_metrics = self.demographics(volumes,
                                                function(volume) {
                                                    return [{name: "EBS Volume Type",
                                                             category: volume.VolumeType},
                                                            {name: "EBS State",
                                                             category: volume.State}];
                                                });

            new_metrics.push(self.create_aggregate_metric("EBS Volume Count", volumes.length));
            new_metrics.push(self.create_aggregate_metric("EBS Volume Total Size",
                                                          _.reduce(volumes, function(memo, vol) {
                                                              return memo + vol.Size;
                                                          }, 0)));
            new_metrics.push(self.create_aggregate_metric("EBS Volume Total Iops",
                                                          _.reduce(volumes, function(memo, vol) {
                                                              return memo + (vol.Iops ? vol.Iops : 0);
                                                          }, 0)));

            var new_events = [];

            if (_.keys(self._last_volume_info).length !== 0) {
                new_events = self.changes("EBS Volume", cur_volume_info, self._last_volume_info);
            }

            self._last_volume_info = cur_volume_info;

            return {
                events: new_events,
                metrics: new_metrics
            };
        }).then(function(events_metrics) {
            return self._ec2_client.describeVolumeStatusAsync({}).then(function(value) {
                var new_metrics = self.demographics(value.VolumeStatuses,
                                                    function(volume) {
                                                        return [{name: "EBS Volume Status",
                                                                 category: volume.VolumeStatus.Status}];
                                                    });
                events_metrics.metrics = events_metrics.metrics.concat(new_metrics);

                value.VolumeStatuses.forEach(function(volume) {
                    // We only report metrics when the status is something other than "ok"
                    if (volume.VolumeStatus.Status !== "ok") {
                        events_metrics.metrics.push(self.create_metric("AWS Metric", "VolumeStatusErrors", 1, {status: volume.VolumeStatus.Status, item: volume.VolumeId}));
                    }
                });
                return events_metrics;
            });
        }).error(function(e) {
            self._logger.error("Could not fetch information on EBS Volumes: " + e);
            return {
                events: [],
                metrics: []
            };
        });
    }
});

EBSMon.aws_product = function() {
    return 'EBS';
};

EBSMon.item_name = function() {
    return 'VolumeId';
};

module.exports = EBSMon;




