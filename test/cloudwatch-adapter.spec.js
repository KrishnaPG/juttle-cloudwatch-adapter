var _ = require('underscore');
var juttle_test_utils = require('juttle/test/runtime/specs/juttle-test-utils');
var Juttle = require('juttle/lib/runtime').Juttle;
var CloudWatchAdapter = require('../');
var check_juttle = juttle_test_utils.check_juttle;
var expect = require('chai').expect;
var read_config = require('juttle/lib/config/read-config');

describe('cloudwatch adapter', function() {
    this.timeout(15000);

    before(function() {

        // Try to read from the config file first. If not present,
        // look in the environment variable JUTTLE_AWS_CONFIG. In
        // TravisCI, the config is provided via the environment to
        // avoid putting sensitive information like ids/auth tokens in
        // source files.

        var config = read_config();

        if (! _.has(config, 'adapters')) {
            if (! _.has(process.env, 'JUTTLE_CLOUDWATCH_CONFIG') ||
                process.env.JUTTLE_CLOUDWATCH_CONFIG === '') {
                throw new Error('To run this test, you must provide the adapter config via the environment as JUTTLE_CLOUDWATCH_CONFIG.');
            }
            var cloudwatch_config = JSON.parse(process.env.JUTTLE_CLOUDWATCH_CONFIG);
            config = {
                adapters: {
                    cloudwatch: cloudwatch_config
                }
            };
        }

        var adapter = CloudWatchAdapter(config.adapters.cloudwatch, Juttle);

        Juttle.adapters.register(adapter.name, adapter);
    });

    describe(' properly returns errors/warnings for arguments like', function() {

        it(' an -every less than 5 minutes', function() {
            return check_juttle({
                program: 'read cloudwatch -every :1m: product="EC2" | view table'
            })
            .then(function(result) {
                expect(result.errors).to.have.length(0);
                expect(result.warnings).to.have.length(1);
                expect(result.warnings[0]).to.contain('-every of < 5 minutes may miss CloudWatch metrics');
            });
        });

        it(' an -every less than 1 minute', function() {
            return check_juttle({
                program: 'read cloudwatch -every :1s: product="EC2" | view table'
            })
            .catch(function(err) {
                expect(err.code).to.equal('RT-ADAPTER-UNSUPPORTED-TIME-OPTION');
            });
        });

        // XXX/mstemm ideally we'd like to have tests that test the
        // config-level overrides for -every warnings and errors work,
        // but there isn't any way to reconfigure or unload an adapter
        // right now.
    });

    it(' can read basic info', function() {
        this.timeout(60000);
        return check_juttle({
            program: 'read cloudwatch | view table'
        })
        .then(function(result) {
            expect(result.errors).to.have.length(0);
            expect(result.warnings).to.have.length(0);
        });
    });
});


