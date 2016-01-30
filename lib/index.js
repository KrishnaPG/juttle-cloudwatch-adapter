var Read = require('./read');

var CloudWatchAdapter = function(config) {

    Read.init(config);

    return {
        name: 'cloudwatch',
        read: Read.read
    };
};

module.exports = CloudWatchAdapter;
