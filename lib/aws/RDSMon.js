var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');

var RDSMon = AWSMon.extend({

    initialize: function(options) {
        var self = this;

        self._rds_client = Promise.promisifyAll(new self._AWS.RDS());

        // Maps from id to most recently fetched information about the
        // item.
        self._last_db_instance_info = {};
    },

    //
    // PUBLIC METHODS
    //
    aws_product: function() {
        return RDSMon.aws_product();
    },

    item_name: function() {
        return RDSMon.item_name();
    },

    // Poll the RDS API and return a list of events and metrics to
    // send to the Jut Data Node

    poll: function() {
        var self = this;

        self._logger.info('Polling RDS Instances...');

        return self._rds_client.describeDBInstancesAsync({}).then(function(value) {

            var cur_db_instance_info = {};

            value.DBInstances.forEach(function(db_inst) {
                cur_db_instance_info[db_inst.DBInstanceIdentifier] = db_inst;
            });

            var db_insts = _.values(cur_db_instance_info);

            var new_metrics = self.demographics(db_insts,
                                                function(db_inst) {
                                                    var demos = [{name: 'RDS DB Class',
                                                                  category: db_inst.DBInstanceClass},
                                                                 {name: 'RDS DB Engine',
                                                                  category: db_inst.Engine},
                                                                 {name: 'RDS DB Engine Version',
                                                                  category: db_inst.EngineVersion},
                                                                 {name: 'RDS DB License Model',
                                                                  category: db_inst.LicenseModel},
                                                                 {name: 'RDS DB Retention Period',
                                                                  category: db_inst.BackupRetentionPeriod},
                                                                 {name: 'RDS DB PubliclyAccessible',
                                                                  category: db_inst.PubliclyAccessible},
                                                                 {name: 'RDS DB Storage Type',
                                                                  category: db_inst.StorageType},
                                                                 {name: 'RDS DB Status',
                                                                  category: db_inst.DBInstanceStatus}];
                                                    if (_.has(db_inst, 'StatusInfos')) {
                                                        demos.push({name: 'RDS DB Read Replica Status',
                                                                    category: db_inst.StatusInfos.Status});
                                                    }
                                                    return demos;
                                                });

            new_metrics.push(self.create_aggregate_metric('RDS DB Count', db_insts.length));
            new_metrics.push(self.create_aggregate_metric('RDS DB Total Allocated Storage',
                                                          _.reduce(db_insts, function(memo, db_inst) {
                                                              return memo + db_inst.AllocatedStorage;
                                                          }, 0)));
            new_metrics.push(self.create_aggregate_metric('RDS DB Total Iops',
                                                          _.reduce(db_insts, function(memo, db_inst) {
                                                              var iops = (_.has(db_inst, 'Iops') ? db_inst.Iops : 0);
                                                              return memo + iops;
                                                          }, 0)));

            var new_events = [];

            if (_.keys(self._last_db_instance_info).length !== 0) {
                new_events = self.changes('RDS DB', cur_db_instance_info, self._last_db_instance_info);
            }

            self._last_db_instance_info = cur_db_instance_info;

            return {
                events: new_events,
                metrics: new_metrics
            };

        }).error(function(e) {
            self._logger.error('Could not fetch information on RDS DB Instances: ' + e);
            return {
                events: [],
                metrics: []
            };
        });
    }
});

RDSMon.aws_product = function() {
    return 'RDS';
};

RDSMon.item_name = function() {
    return 'DBInstanceIdentifier';
};

module.exports = RDSMon;




