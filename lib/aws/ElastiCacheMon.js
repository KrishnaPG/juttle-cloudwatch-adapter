var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');

var ElastiCacheMon = AWSMon.extend({

    initialize: function(options) {
        var self = this;

        self._ec_client = Promise.promisifyAll(new self._AWS.ElastiCache());

        // Maps from cluster id to most recently fetched information
        // about cluster
        self._last_cluster_info = {};
    },

    //
    // PUBLIC METHODS
    //

    aws_product: function() {
        return ElastiCacheMon.aws_product();
    },

    item_name: function() {
        return ElastiCacheMon.item_name();
    },

    // Poll the ElastiCache API and return a list of events and metrics to
    // send to the Jut Data Node

    poll: function() {
        var self = this;

        self._logger.info('Polling ElastiCache Clusters...');

        var cur_cluster_info = {};

        var list_clusters_batch = function (marker) {
            var opts = {};
            if (marker) {
                opts = _.extend(opts, {Marker: marker});
            }

            return self._ec_client.describeCacheClustersAsync(opts).then(function(value) {
                value.CacheClusters.forEach(function(cluster) {
                    cur_cluster_info[cluster.CacheClusterId] = cluster;
                });

                if (_.has(value.Marker)) {
                    return list_clusters_batch(value.Marker);
                }
            });
        };

        return list_clusters_batch(undefined).then(function() {

            var clusters = _.values(cur_cluster_info);

            var new_metrics = self.demographics(clusters,
                                                function(cluster) {
                                                    return [{name: 'ElastiCache Cache Node Type',
                                                             category: cluster.CacheNodeType},
                                                            {name: 'ElastiCache Engine',
                                                             category: cluster.Engine},
                                                            {name: 'ElastiCache Cluster Status',
                                                             category: cluster.CacheClusterStatus},
                                                            {name: 'ElastiCache Num Cache Nodes',
                                                             category: cluster.NumCacheNodes},
                                                            {name: 'ElastiCache Engine Version',
                                                             category: cluster.EngineVersion}];
                                                });

            new_metrics.push(self.create_aggregate_metric('ElastiCache Cluster Count', clusters.length));
            new_metrics.push(self.create_aggregate_metric('ElastiCache Total Cache Nodes',
                                                          _.reduce(clusters, function(memo, cluster) {
                                                              return memo + cluster.NumCacheNodes;
                                                          }, 0)));

            var new_events = [];

            if (_.keys(self._last_cluster_info).length !== 0) {
                new_events = self.changes('ElastiCache Cluster', cur_cluster_info, self._last_cluster_info);
            }

            self._last_cluster_info = cur_cluster_info;

            return {
                events: new_events,
                metrics: new_metrics
            };

        }).error(function(e) {
            self._logger.error('Could not fetch information on ElastiCache Clusters: ' + e);
            return {
                events: [],
                metrics: []
            };
        });
    }
});

ElastiCacheMon.aws_product = function() {
    return 'ElastiCache';
};

ElastiCacheMon.item_name = function() {
    return 'CacheClusterId';
};

module.exports = ElastiCacheMon;




