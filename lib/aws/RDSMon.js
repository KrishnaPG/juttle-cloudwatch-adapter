'use strict';
var Promise = require('bluebird');
var _ = require('underscore');
var AWSMon = require('./AWSMon.js');

class RDSMon extends AWSMon {

    constructor(options) {
        super(options);

        this._rds_client = Promise.promisifyAll(new this._AWS.RDS());

        // Maps from id to most recently fetched information about the
        // item.
        this._last_db_instance_info = {};
    }

    //
    // PUBLIC METHODS
    //
    aws_product() {
        return RDSMon.aws_product();
    }

    item_name() {
        return RDSMon.item_name();
    }

    // Poll the RDS API and return a list of events and metrics.

    poll(now) {
        this._now = now;

        this._logger.info('Polling RDS Instances...');

        return this._rds_client.describeDBInstancesAsync({}).then((value) => {

            let cur_db_instance_info = {};

            for(let db_inst of value.DBInstances) {
                cur_db_instance_info[db_inst.DBInstanceIdentifier] = db_inst;
            }

            let db_insts = _.values(cur_db_instance_info);

            let new_metrics = this.demographics(db_insts,
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

            new_metrics.push(this.create_aggregate_metric('RDS DB Count', db_insts.length));
            new_metrics.push(this.create_aggregate_metric('RDS DB Total Allocated Storage',
                                                          _.reduce(db_insts, (memo, db_inst) => {
                                                              return memo + db_inst.AllocatedStorage;
                                                          }, 0)));
            new_metrics.push(this.create_aggregate_metric('RDS DB Total Iops',
                                                          _.reduce(db_insts, (memo, db_inst) => {
                                                              var iops = (_.has(db_inst, 'Iops') ? db_inst.Iops : 0);
                                                              return memo + iops;
                                                          }, 0)));

            let new_events = [];

            if (_.keys(this._last_db_instance_info).length !== 0) {
                new_events = this.changes('RDS DB', cur_db_instance_info, this._last_db_instance_info);
            }

            this._last_db_instance_info = cur_db_instance_info;

            return {
                events: new_events,
                metrics: new_metrics
            };

        }).error((e) => {
            this.o_logger.error('Could not fetch information on RDS DB Instances: ' + e);
            return {
                events: [],
                metrics: []
            };
        });
    }
}

RDSMon.aws_product = function() {
    return 'RDS';
};

RDSMon.item_name = function() {
    return 'DBInstanceIdentifier';
};

module.exports = RDSMon;




