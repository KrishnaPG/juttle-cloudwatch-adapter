var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');

var ELBMon = AWSMon.extend({

    initialize: function(options) {
        var self = this;

        self._aws_product = "ELB";
        self._item_name = 'LoadBalancerName';

        self._elb_client = Promise.promisifyAll(new self._AWS.ELB());

        // Maps from load balancer id to most recently fetched
        // information about the item.
        self._last_load_balancer_info = {};
    },

    //
    // PUBLIC METHODS
    //

    // Poll the ELB API and return a list of events and metrics to
    // send to the Jut Data Node

    poll: function() {
        var self = this;

        self._logger.info("Polling ELB Load Balancers...");

        var now = new Date();

        return self._elb_client.describeLoadBalancersAsync({}).then(function(value) {

            var cur_load_balancer_info = {};

            value.LoadBalancerDescriptions.forEach(function(elb) {
                cur_load_balancer_info[elb.LoadBalancerName] = elb;
            });

            var elbs = _.values(cur_load_balancer_info);

            var new_metrics = self.demographics(elbs,
                                                function(elb) {
                                                    return [{name: "ELB Scheme",
                                                             category: elb.Scheme},
                                                            {name: "ELB Health Check Target",
                                                             category: elb.HealthCheck.Target}];
                                                });

            new_metrics.push(self.create_aggregate_metric("ELB Load Balancer Count", elbs.length));

            var new_events = [];

            if (_.keys(self._last_load_balancer_info).length !== 0) {
                new_events = self.changes("ELB Load Balancer", cur_load_balancer_info, self._last_load_balancer_info);
            }

            self._last_load_balancer_info = cur_load_balancer_info;

            return {
                events: new_events,
                metrics: new_metrics
            };

        }).error(function(e) {
            self._logger.error("Could not fetch information on ELB Load Balancers: " + e);
            return {
                events: [],
                metrics: []
            };
        });
    }
});

module.exports = ELBMon;




