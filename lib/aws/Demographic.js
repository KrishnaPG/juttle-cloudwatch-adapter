var Base = require('extendable-base');
var _ = require('underscore');

var Demographic = Base.extend({

    initialize: function(options) {
        var self = this;

        self._name = options.name;

        self._counts = {};
    },

    add: function(category) {
        var self = this;

        if (!_.has(self._counts, category)) {
            self._counts[category] = 0;
        }
        self._counts[category]++;
    },

    get_counts: function() {
        var self = this;

        return self._counts;
    },

    name: function() {
        var self = this;

        return self._name;
    }
});

module.exports = Demographic;
