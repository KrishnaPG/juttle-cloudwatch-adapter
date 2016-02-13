'use strict';
var _ = require('underscore');
var Read = require('./read');

var CloudWatchAdapter = function(config) {

    for (let property of ['access_key', 'secret_key', 'region']) {
        if (!_.has(config, property)) {
            throw new Error(`AWS Adapter configuration missing required value ${property}`);
        }
    }

    Read.init(config);

    return {
        name: 'cloudwatch',
        read: Read.read
    };
};

module.exports = CloudWatchAdapter;
