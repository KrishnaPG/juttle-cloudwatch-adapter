'use strict';
var jsdiff = require('diff');
var _ = require('underscore');
var Demographic = require('./Demographic.js');

class AWSMon {

    constructor(options) {
        this._AWS = options.AWS;
        this._logger = options.logger;

        // Set in poll
        this._now = undefined;
    }

    //
    // PUBLIC METHODS
    //
    aws_product() {
        return AWSMon.aws_product();
    }

    item_name() {
        return AWSMon.item_name();
    }

    // Should be overridden by derived classes. Should also return an
    // immediate value or a Promise.
    poll(now) {
        this._now = now;

        return {
            events: [],
            metrics: []
        };
    }

    //
    // PROTECTED METHODS
    //

    create_event(event_type, item, msg) {
        msg = msg || '';

        var event = {
            time: this._now,
            aws_product: this.aws_product(),
            event_type: event_type,
            item: item,
            msg: msg
        };

        return event;
    }

    create_demographic_metric(demographic_type, name, value) {
        return this.create_metric('AWS Demographic',
                                  name, value,
                                  {demographic: demographic_type});
    }

    create_aggregate_metric(aggregate_type, value) {
        return this.create_metric('AWS Aggregate',
                                  'total', value,
                                  {aggregate: aggregate_type});
    }

    create_metric(metric_type, name, value, additional_fields) {
        additional_fields = additional_fields || {};

        var metric = _.extend({
            time: this._now,
            aws_product: this.aws_product(),
            metric_type: metric_type,
            name: name,
            value: value
        }, additional_fields);

        return metric;
    }

    // Given a new and current hash mapping item id -> item, emit
    // events when items are added, removed, or changed.
    changes(itemtype, cur_items, old_items) {
        var events = [];

        var cur_ids = _.keys(cur_items);
        var old_ids = _.keys(old_items);

        var added = _.difference(cur_ids, old_ids);

        for(let id of added) {
            events.push(this.create_event(itemtype + ' Added', id));
        }

        var removed = _.difference(old_ids, cur_ids);

        for(let id of removed) {
            events.push(this.create_event(itemtype + ' Removed', id));
        }

        var existing = _.intersection(cur_ids, old_ids);

        for(let id of existing) {
            let diffs = jsdiff.diffJson(old_items[id],
                                        cur_items[id]);

            if (diffs.length === 1 &&
                ! _.has(diffs[0], 'added') &&
                ! _.has(diffs[0], 'removed')) {
                // No changes
            } else {
                // XXX/mstemm add details on what changed
                events.push(this.create_event(itemtype + ' Changed',
                                              id,
                                              ''));
            }
        }

        this._logger.info(itemtype + ': ' + added.length + ' added, ' + removed.length + ' removed, ' + existing.length + ' existing');
        return events;
    }

    // select_fn should return an array of objects having these
    // properites:
    //    name: a name of the demographic (i.e. 'EC2 instance type')
    //    category: a category for the item (i.e. 'm3.large')

    demographics(items, select_fn) {
        var metrics = [];

        var demographics = {};

        for(let item of items) {
            let cats = select_fn(item);

            cats.forEach(function(cat) {
                if (! _.has(demographics, cat.name)) {
                    demographics[cat.name] = new Demographic({name: cat.name});
                }
                demographics[cat.name].add(cat.category || 'unknown');
            });
        }

        for(let dem of _.values(demographics)) {
            let counts = dem.get_counts();
            for(let category of _.keys(counts)) {
                metrics.push(this.create_demographic_metric(dem.name(), category, counts[category]));
            }
        }

        return metrics;
    }
}

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




