'use strict';
var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');

class LambdaMon extends AWSMon {
    constructor(options) {
        super(options);

        this._func_client = new this._AWS.Lambda();
        this._func_client.listFunctionsAsync = Promise.promisify(this._func_client.listFunctions);

        // Maps from function id to most recently fetched information
        // about function
        this._last_func_info = {};
    }

    //
    // PUBLIC METHODS
    //

    aws_product() {
        return LambdaMon.aws_product();
    }

    item_name() {
        return LambdaMon.item_name();
    }

    // Poll the Lambda API and return a list of events and metrics.

    poll(now) {
        this._now = now;
        this._logger.info('Polling Lambda Functions...');

        let cur_func_info = {};

        let list_funcs_batch = (marker) => {
            let opts = {};
            if (marker) {
                opts = _.extend(opts, {Marker: marker});
            }

            return this._func_client.listFunctionsAsync(opts).then((value) => {
                for(let func of value.Functions) {
                    cur_func_info[func.FunctionName] = func;
                }

                if (_.has(value.Marker)) {
                    return list_funcs_batch(value.Marker);
                } else {
                    return Promise.resolve();
                }
            });
        };

        return list_funcs_batch(undefined).then(() => {

            let funcs = _.values(cur_func_info);

            let new_metrics = this.demographics(funcs,
                                                function(func) {
                                                    return [{name: 'Lambda Runtime',
                                                             category: func.Runtime},
                                                            {name: 'Lambda Role',
                                                             category: func.Role},
                                                            {name: 'Lambda Timeout',
                                                             category: func.Timeout},
                                                            {name: 'Lambda Memory Size',
                                                             category: func.MemorySize},
                                                            {name: 'Lambda Version',
                                                             category: func.Version},
                                                            {name: 'Lambda Handler',
                                                             category: func.Handler}];
                                                });

            new_metrics.push(this.create_aggregate_metric('Lambda Function Count', funcs.length));
            new_metrics.push(this.create_aggregate_metric('Lambda Total Memory Size',
                                                          _.reduce(funcs, (memo, func) => {
                                                              return memo + func.MemorySize;
                                                          }, 0)));

            let new_events = [];

            if (_.keys(this._last_func_info).length !== 0) {
                new_events = this.changes('Lambda Function', cur_func_info, this._last_func_info);
            }

            this._last_func_info = cur_func_info;

            return {
                events: new_events,
                metrics: new_metrics
            };

        }).error((e) => {
            this._logger.info('Could not fetch information on Lambda Functions: ' + e);
            return {
                events: [],
                metrics: []
            };
        });
    }
}

LambdaMon.aws_product = function() {
    return 'Lambda';
};

LambdaMon.item_name = function() {
    return 'FunctionName';
};

module.exports = LambdaMon;




