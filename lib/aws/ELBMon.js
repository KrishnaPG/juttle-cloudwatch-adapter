'use strict';
var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');

class ELBMon extends AWSMon {

    constructor(options) {
        super(options);

        this._elb_client = Promise.promisifyAll(new this._AWS.ELB());

        // Maps from load balancer id to most recently fetched
        // information about the item.
        this._last_load_balancer_info = {};
    }

    //
    // PUBLIC METHODS
    //

    aws_product() {
        return ELBMon.aws_product();
    }

    item_name() {
        return ELBMon.item_name();
    }

    // Poll the ELB API and return a list of events and metrics.

    poll(now) {
        this._logger.info('Polling ELB Load Balancers...');
        this._now = now;

        return this._elb_client.describeLoadBalancersAsync({}).then((value) => {

            let cur_load_balancer_info = {};

            for(let elb of value.LoadBalancerDescriptions) {
                cur_load_balancer_info[elb.LoadBalancerName] = elb;
            }

            let elbs = _.values(cur_load_balancer_info);

            let new_metrics = this.demographics(elbs,
                                                function(elb) {
                                                    return [{name: 'ELB Scheme',
                                                             category: elb.Scheme},
                                                            {name: 'ELB Health Check Target',
                                                             category: elb.HealthCheck.Target}];
                                                });

            new_metrics.push(this.create_aggregate_metric('ELB Load Balancer Count', elbs.length));

            let new_events = [];

            if (_.keys(this._last_load_balancer_info).length !== 0) {
                new_events = this.changes('ELB Load Balancer', cur_load_balancer_info, this._last_load_balancer_info);
            }

            this._last_load_balancer_info = cur_load_balancer_info;

            return {
                events: new_events,
                metrics: new_metrics
            };

        }).error((e) => {
            this._logger.error('Could not fetch information on ELB Load Balancers: ' + e);
            return {
                events: [],
                metrics: []
            };
        });
    }
}

ELBMon.aws_product = function() {
    return 'ELB';
};

ELBMon.item_name = function() {
    return 'LoadBalancerName';
};

module.exports = ELBMon;




