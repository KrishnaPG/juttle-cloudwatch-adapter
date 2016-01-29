'use strict';
var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');

class EC2InstanceMon extends AWSMon {

    constructor(options) {
        super(options);

        this._ec2_client = Promise.promisifyAll(new this._AWS.EC2());

        // Maps from instance id to most recently fetched information
        // about instance
        this._last_instance_info = {};
    }

    //
    // PUBLIC METHODS
    //

    aws_product() {
        return EC2InstanceMon.aws_product();
    }

    item_name() {
        return EC2InstanceMon.item_name();
    }

    // Poll the EC2 API and return a list of events and metrics.

    poll(now) {

        this._logger.info('Polling EC2 Instances...');
        this._now = now;

        return this._ec2_client.describeInstancesAsync({}).then((value) => {

            let cur_instance_info = {};

            for(let reservation of value.Reservations) {
                for(let instance of reservation.Instances) {
                    cur_instance_info[instance.InstanceId] = instance;
                }
            }

            let instances = _.values(cur_instance_info);
            let new_metrics = this.demographics(instances,
                                                function(instance) {
                                                    return [{name: 'EC2 Instance Type',
                                                             category: instance.InstanceType},
                                                            {name: 'EC2 State',
                                                             category: instance.State.Name},
                                                            {name: 'EC2 Root Device Type',
                                                             category: instance.RootDeviceType}];
                                                });

            new_metrics.push(this.create_aggregate_metric('EC2 Instance Count', instances.length));

            let new_events = [];

            if (_.keys(this._last_instance_info).length !== 0) {
                new_events = this.changes('EC2 Instance', cur_instance_info, this._last_instance_info);
            }

            this._last_instance_info = cur_instance_info;

            return {
                events: new_events,
                metrics: new_metrics
            };

        }).error((e) => {
            this._logger.error('Could not fetch information on EC2 Instances: ' + e);
            return {
                events: [],
                metrics: []
            };
        });
    }
}

EC2InstanceMon.aws_product = function() {
    return 'EC2';
};

EC2InstanceMon.item_name = function() {
    return 'InstanceId';
};

module.exports = EC2InstanceMon;




