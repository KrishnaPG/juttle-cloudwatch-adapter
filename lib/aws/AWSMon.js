var jsdiff = require('diff');
var Base = require('extendable-base');
var _ = require('underscore');
var Demographic = require('./Demographic.js');
var Promise = require('bluebird');

var AWSMon = Base.extend({

    initialize: function(options) {
        var self = this;

        self._AWS = options.AWS;
        self._aws_product = options.aws_product;
        self._logger = options.logger;
        self._cloudwatch_max_age = 600;

        // Used by remember_aws_item below.
        self._recent_aws_items = {};
    },

    //
    // PUBLIC METHODS
    //

    aws_product: function() {
        var self = this;

        return self._aws_product;
    },

    //
    // PROTECTED METHODS
    //

    // Should be overridden by derived classes. Should also return an
    // immediate value or a Promise.
    poll: function() {
        return {
            events: [],
            metrics: []
        };
    },

    // Remember the given AWS item (expressed as a name
    // e.g. InstanceId/VolumeId/etc + Value like 'i-ba662161' or
    // 'vol-98a4557e'). Remembered items are used as the source to the
    // CloudWatch plugin.
    //
    // This is put in the base class so we can apply a single policy
    // for which items to keep track of via CloudWatch.
    remember_aws_item: function(now, name, id) {
        var self = this;

        if (_.has(self._recent_aws_items, id)) {
            self._recent_aws_items[id].last_seen = now;
        } else {
            self._recent_aws_items[id] = {
                name: name,
                last_seen: now
            };
        }
    },

    // Remove items that have not been seen in the last
    // cloudwatch_max_age seconds.
    age_aws_items: function(now) {
        var self = this;

        self._recent_aws_items = _.pick(self._recent_aws_items, function(value, key, obj) {
            return ((now - value.last_seen) <= self._cloudwatch_max_age * 1000);
        });
    },

    // Return an array of all items for which CloudWatch metrics
    // should be fetched, as an array of Name + Value pairs.
    get_aws_items: function() {
        var self = this;

        return _.map(_.keys(self._recent_aws_items), function(item_id) {
            return {
                Name: self._recent_aws_items[item_id].name,
                Value: item_id
            };
        });
    },

    create_event: function(event_type, item, msg) {
        msg = msg || "";

        var self = this;

        var event = {
            time: new Date().toISOString(),
            aws_product: self.aws_product(),
            event_type: event_type,
            item: item,
            msg: msg
        };

        return event;
    },

    create_demographic_metric: function(demographic_type, name, value) {
        var self = this;

        return self.create_metric("AWS Demographic",
                                  name, value,
                                  {demographic: demographic_type});
    },

    create_aggregate_metric: function(aggregate_type, value) {
        var self = this;

        return self.create_metric("AWS Aggregate",
                                  "total", value,
                                  {aggregate: aggregate_type});
    },

    create_metric: function(metric_type, name, value, additional_fields) {
        var self = this;
        additional_fields = additional_fields || {};

        var metric = _.extend({
            time: new Date().toISOString(),
            aws_product: self.aws_product(),
            metric_type: metric_type,
            name: name,
            value: value
        }, additional_fields);

        return metric;
    },

    // Given a new and current hash mapping item id -> item, emit
    // events when items are added, removed, or changed.
    changes: function(itemtype, cur_items, old_items) {
        var self = this;

        var events = [];

        var cur_ids = _.keys(cur_items);
        var old_ids = _.keys(old_items);

        var added = _.difference(cur_ids, old_ids);

        added.forEach(function(id) {
            events.push(self.create_event(itemtype + " Added", id));
        });

        var removed = _.difference(old_ids, cur_ids);

        removed.forEach(function(id) {
            events.push(self.create_event(itemtype + " Removed", id));
        });

        var existing = _.intersection(cur_ids, old_ids);

        existing.forEach(function(id) {
            var diffs = jsdiff.diffJson(old_items[id],
                                        cur_items[id]);

            if (diffs.length === 1 &&
                ! _.has(diffs[0], "added") &&
                ! _.has(diffs[0], "removed")) {
                // No changes
            } else {
                // XXX/mstemm add details on what changed
                events.push(self.create_event(itemtype + " Changed",
                                              id,
                                              ""));
            }
        });

        self._logger.info(itemtype + ": " + added.length + " added, " + removed.length + " removed, " + existing.length + " existing");
        return events;
    },

    // select_fn should return an array of objects having these
    // properites:
    //    name: a name of the demographic (i.e. "EC2 instance type")
    //    category: a category for the item (i.e. "m3.large")

    demographics: function(items, select_fn) {
        var self = this;

        var metrics = [];

        var demographics = {};

        items.forEach(function(item) {
            var cats = select_fn(item);

            cats.forEach(function(cat) {
                if (! _.has(demographics, cat.name)) {
                    demographics[cat.name] = new Demographic({name: cat.name});
                }
                demographics[cat.name].add(cat.category || "unknown");
            });
        });

        _.values(demographics).forEach(function(dem) {
            var counts = dem.get_counts();
            _.keys(counts).forEach(function(category) {
                metrics.push(self.create_demographic_metric(dem.name(), category, counts[category]));
            });
        });

        return metrics;
    }
});

module.exports = AWSMon;




