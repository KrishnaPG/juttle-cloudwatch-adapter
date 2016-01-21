var Read = require('./read');

var AwsAdapter = function(config) {

    Read.init(config);

    return {
        name: 'aws',
        read: Read.read,
    };
};

module.exports = AwsAdapter;
