var jsdiff = require('diff');
var Base = require('extendable-base');
var _ = require('underscore');
var Demographic = require('./Demographic.js');
var Promise = require('bluebird');

var AWSMon = Base.extend({

    initialize: function(options) {
        var self = this;

        self._AWS = options.AWS;
        self._logger = options.logger;
    },

    //
    // PUBLIC METHODS
    //
    aws_product: function() {
        return AWSMon.aws_product();
    },

    item_name: function() {
        return AWSMon.item_name();
    },

    // Should be overridden by derived classes. Should also return an
    // immediate value or a Promise.
    poll: function() {
        return {
            events: [],
            metrics: []
        };
    },

    //
    // PROTECTED METHODS
    //

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

// Showing some additional functions that should be created for each
// sub-class. These versions should never end up being called.

AWSMon.aws_product = function() {
    return undefined;
};

// Each AWS Product has a list of items (e.g. EC2 Instances,
// EBS Volumes, RDS databases, etc). This holds the name in
// the AWS api for those items. Used by CloudWatchMon to fetch
// metrics.

AWSMon.item_name = function() {
    return undefined;
};

module.exports = AWSMon;




