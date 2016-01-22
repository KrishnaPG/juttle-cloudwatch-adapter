var AWS = require('aws-sdk');
var EC2InstanceMon = require('./aws/EC2InstanceMon.js');
var EBSMon = require('./aws/EBSMon.js');
var ELBMon = require('./aws/ELBMon.js');
var RDSMon = require('./aws/RDSMon.js');
var CloudFrontMon = require('./aws/CloudFrontMon.js');
var AutoScalingMon = require('./aws/AutoScalingMon.js');
var ElastiCacheMon = require('./aws/ElastiCacheMon.js');
var LambdaMon = require('./aws/LambdaMon.js');
var CloudWatchMon = require('./aws/CloudWatchMon.js');
var Juttle = require('juttle/lib/runtime').Juttle;
var JuttleErrors = require('juttle/lib/errors');
var JuttleMoment = require('juttle/lib/moment/juttle-moment');
var Promise = require('bluebird');
var _ = require('underscore');

var Read = Juttle.proc.source.extend({
    procName: 'read aws',

    initialize: function(options, params, location, program) {

        var self = this;

        self.logger.debug('intitialize', options, params);

        var time_related_options = ['from', 'to', 'last'];
        var allowed_options = time_related_options.concat(['raw']);
        var unknown = _.difference(_.keys(options), allowed_options);

        if (unknown.length > 0) {
            throw self.compile_error('RT-UNKNOWN-OPTION-ERROR',
                                     {proc: 'read aws', option: unknown[0]});
        }

        // One of 'from', 'to', or 'last' must be present.
        // var opts = _.intersection(_.keys(options), time_related_options);
        // if (opts.length === 0) {
        //     throw self.compile_error('RT-MISSING-TIME-RANGE-ERROR');
        // }

        // If 'from'/'to' are present, 'last' can not be present.
        if ((_.has(options, 'from') || _.has(options, 'to')) &&
            _.has(options, 'last')) {
            throw self.compile_error('RT-LAST-FROM-TO-ERROR');
        }

        // 'from' must be before 'to'
        if (_.has(options, 'from') && _.has(options, 'to') &&
            options.from > options.to) {
            throw self.compile_error('RT-TO-FROM-MOMENT-ERROR');
        }

        // If 'last' is specified, set appropriate 'from'/'to'
        if (_.has(options, 'last')) {
            self.from = program.now.subtract(options.last);
            self.to = program.now;
        } else {
            // Initialize from/to if necessary.
            self.from = options.from || program.now;
            self.to = options.to || program.now;
        }

        self.raw = options.raw;
        self.filter_search_expr = undefined;

        if (params.filter_ast) {
            // XXX/mstemm fill in
        }

        // Enable plugins for the appropriate set of products.
        var all_plugins = ["EC2", "EBS", "ELB",
                           "RDS", "CloudFront",
                           "AutoScaling", "ElastiCache",
                           "Lambda", "CloudWatch"];

        self._plugin_names = all_plugins.slice(0);

        self.logger.info("Enabled Plugins:", self._plugin_names);

        var opts = {
            AWS: AWS,
        };

        self._plugins =  _.map(self._plugin_names, function(pl_name) {
            var pl_opts = _.extend({}, opts, {aws_product: pl_name, logger: self.logger});
            var plugin;
            switch (pl_name) {
            case 'EC2':
                plugin = new EC2InstanceMon(pl_opts);
                break;
            case 'EBS':
                plugin = new EBSMon(pl_opts);
                break;
            case 'ELB':
                plugin = new ELBMon(pl_opts);
                break;
            case 'RDS':
                plugin = new RDSMon(pl_opts);
                break;
            case 'CloudFront':
                plugin = new CloudFrontMon(pl_opts);
                break;
            case 'AutoScaling':
                plugin = new AutoScalingMon(pl_opts);
                break;
            case 'ElastiCache':
                plugin = new ElastiCacheMon(pl_opts);
                break;
            case 'Lambda':
                plugin = new LambdaMon(pl_opts);
                break;
            case 'CloudWatch':
                self._cloudwatch_plugin = new CloudWatchMon(pl_opts);
                plugin = self._cloudwatch_plugin;
                break;
            default:
                throw "No plugin named " + pl_name + " exists, not continuing";
            }
            return plugin;
        });

        // Cloudwatch gets all plugins (including itself, which will be a
        // no-op unless it decides to add items via remember_aws_items).
        self._cloudwatch_plugin.add_plugins(_.filter(self._plugins, function(plugin) {
            return (plugin.aws_product() !== "CloudWatch");
        }));

        self._should_stop = false;
    },

    start: function() {
        var self = this;

        self._poll();
    },

    teardown: function() {

        self._should_stop = true;
    },

    // Non-public methods below here.
    _poll: function () {
        var self = this;

        var promises = _.map(self._plugins, function(plugin) {
            return plugin.poll();
        });

        var now = new JuttleMoment();

        return Promise.all(promises).then(function(results) {
            results.forEach(function(result) {
                if (result) {
                    if (result.metrics && result.metrics.length > 0) {
                        self.emit(result.metrics);
                    }
                    if (result.events && result.events.length > 0) {
                        self.emit(result.events);
                    }
                }
            });
        }).error(function(err) {
            self.logger.error("Could not poll AWS", err);
        }).finally(function() {
            if (! self._should_stop) {
                var next_poll = now.add(JuttleMoment.duration(30, 's'));
                self.program.scheduler.schedule(next_poll.unixms(), function() {
                    self._poll();
                });
            }
        });
    }
});

function init(config) {
    AWS.config.update({
        accessKeyId: config.access_key,
        secretAccessKey: config.secret_key,
        region: config.region
    });
}

module.exports = {
    init: init,
    read: Read
};

