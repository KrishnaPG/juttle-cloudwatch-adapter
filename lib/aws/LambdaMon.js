var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');

var LambdaMon = AWSMon.extend({

    initialize: function(options) {
        var self = this;

        self._func_client = new self._AWS.Lambda();
        self._func_client.listFunctionsAsync = Promise.promisify(self._func_client.listFunctions);

        // Maps from function id to most recently fetched information
        // about function
        self._last_func_info = {};
    },

    //
    // PUBLIC METHODS
    //

    aws_product: function() {
        return LambdaMon.aws_product();
    },

    item_name: function() {
        return LambdaMon.item_name();
    },

    // Poll the Lambda API and return a list of events and metrics to
    // send to the Jut Data Node

    poll: function() {
        var self = this;

        self._logger.info("Polling Lambda Functions...");

        var now = new Date();

        var cur_func_info = {};

        var list_funcs_batch = function (marker) {
            var opts = {};
            if (marker) {
                opts = _.extend(opts, {Marker: marker});
            }

            return self._func_client.listFunctionsAsync(opts).then(function(value) {
                value.Functions.forEach(function(func) {
                    cur_func_info[func.FunctionName] = func;
                });

                if (_.has(value.Marker)) {
                    return list_funcs_batch(value.Marker);
                }
            });
        };

        return list_funcs_batch(undefined).then(function() {

            var funcs = _.values(cur_func_info);

            var new_metrics = self.demographics(funcs,
                                                function(func) {
                                                    return [{name: "Lambda Runtime",
                                                             category: func.Runtime},
                                                            {name: "Lambda Role",
                                                             category: func.Role},
                                                            {name: "Lambda Timeout",
                                                             category: func.Timeout},
                                                            {name: "Lambda Memory Size",
                                                             category: func.MemorySize},
                                                            {name: "Lambda Version",
                                                             category: func.Version},
                                                            {name: "Lambda Handler",
                                                             category: func.Handler}];
                                                });

            new_metrics.push(self.create_aggregate_metric("Lambda Function Count", funcs.length));
            new_metrics.push(self.create_aggregate_metric("Lambda Total Memory Size",
                                                          _.reduce(funcs, function(memo, func) {
                                                              return memo + func.MemorySize;
                                                          }, 0)));

            var new_events = [];

            if (_.keys(self._last_func_info).length !== 0) {
                new_events = self.changes("Lambda Function", cur_func_info, self._last_func_info);
            }

            self._last_func_info = cur_func_info;

            return {
                events: new_events,
                metrics: new_metrics
            };

        }).error(function(e) {
            self._logger.info("Could not fetch information on Lambda Functions: " + e);
            return {
                events: [],
                metrics: []
            };
        });
    }
});

LambdaMon.aws_product = function() {
    return 'Lambda';
};

LambdaMon.item_name = function() {
    return 'FunctionName';
};

module.exports = LambdaMon;




