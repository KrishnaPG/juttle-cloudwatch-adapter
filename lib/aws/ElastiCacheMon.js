'use strict';
var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');

class ElastiCacheMon extends AWSMon {
    constructor(options) {
        super(options);

        this._ec_client = Promise.promisifyAll(new this._AWS.ElastiCache());

        // Maps from cluster id to most recently fetched information
        // about cluster
        this._last_cluster_info = {};
    }

    //
    // PUBLIC METHODS
    //

    aws_product() {
        return ElastiCacheMon.aws_product();
    }

    item_name() {
        return ElastiCacheMon.item_name();
    }

    // Poll the ElastiCache API and return a list of events and metrics.

    poll(now) {
        this._now = now;
        this._logger.info('Polling ElastiCache Clusters...');

        let cur_cluster_info = {};

        let list_clusters_batch = (marker) => {
            var opts = {};
            if (marker) {
                opts = _.extend(opts, {Marker: marker});
            }

            return this._ec_client.describeCacheClustersAsync(opts).then((value) => {
                for(let cluster of value.CacheClusters) {
                    cur_cluster_info[cluster.CacheClusterId] = cluster;
                }

                if (_.has(value.Marker)) {
                    return list_clusters_batch(value.Marker);
                } else {
                    return Promise.resolve();
                }
            });
        };

        return list_clusters_batch(undefined).then(() => {

            let clusters = _.values(cur_cluster_info);

            let new_metrics = this.demographics(clusters,
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

            new_metrics.push(this.create_aggregate_metric('ElastiCache Cluster Count', clusters.length));
            new_metrics.push(this.create_aggregate_metric('ElastiCache Total Cache Nodes',
                                                          _.reduce(clusters, (memo, cluster) => {
                                                              return memo + cluster.NumCacheNodes;
                                                          }, 0)));

            let new_events = [];

            if (_.keys(this._last_cluster_info).length !== 0) {
                new_events = this.changes('ElastiCache Cluster', cur_cluster_info, this._last_cluster_info);
            }

            this._last_cluster_info = cur_cluster_info;

            return {
                events: new_events,
                metrics: new_metrics
            };

        }).error((e) => {
            this._logger.error('Could not fetch information on ElastiCache Clusters: ' + e);
            return {
                events: [],
                metrics: []
            };
        });
    }
}

ElastiCacheMon.aws_product = function() {
    return 'ElastiCache';
};

ElastiCacheMon.item_name = function() {
    return 'CacheClusterId';
};

module.exports = ElastiCacheMon;




