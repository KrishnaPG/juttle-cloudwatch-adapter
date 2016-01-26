var AWS = require('aws-sdk');
var EC2InstanceMon = require('./EC2InstanceMon.js');
var EBSMon = require('./EBSMon.js');
var ELBMon = require('./ELBMon.js');
var RDSMon = require('./RDSMon.js');
var CloudFrontMon = require('./CloudFrontMon.js');
var AutoScalingMon = require('./AutoScalingMon.js');
var ElastiCacheMon = require('./ElastiCacheMon.js');
var LambdaMon = require('./LambdaMon.js');
var CloudWatchMon = require('./CloudWatchMon.js');
var _ = require('underscore');

// Maps from product name to class.
var products = {
    EC2: EC2InstanceMon,
    EBS: EBSMon,
    ELB: ELBMon,
    RDS: RDSMon,
    CloudFront: CloudFrontMon,
    AutoScaling: AutoScalingMon,
    ElastiCache: ElastiCacheMon,
    Lambda: LambdaMon
};

var supported_products = function() {
    return _.keys(products);
};

var aws_item_name = function(aws_product) {
    return products[aws_product].item_name();
};

var create_aws_plugin = function(aws_product, logger) {
    var opts = {
        AWS: AWS,
        logger: logger
    };

    // CloudWatch is not explicitly listed above, so handle it
    // separately.
    if (aws_product === 'CloudWatch') {
        return new CloudWatchMon(opts);
    } else {
        return new products[aws_product](opts);
    }
};

var init = function(config) {
    AWS.config.update({
        accessKeyId: config.access_key,
        secretAccessKey: config.secret_key,
        region: config.region
    });
}

module.exports = {
    init: init,
    supported_products: supported_products,
    aws_item_name: aws_item_name,
    create_aws_plugin: create_aws_plugin
};
