var _ = require('underscore');
var juttle_test_utils = require('juttle/test/runtime/specs/juttle-test-utils');
var Juttle = require('juttle/lib/runtime').Juttle;
var CloudWatchAdapter = require('../');
var check_juttle = juttle_test_utils.check_juttle;
var expect = require('chai').expect;
var read_config = require('juttle/lib/config/read-config');

describe('cloudwatch adapter', function() {

    before(function() {

        // Try to read from the config file first. If not present,
        // look in the environment variable JUTTLE_AWS_CONFIG. In
        // TravisCI, the config is provided via the environment to
        // avoid putting sensitive information like ids/auth tokens in
        // source files.

        var config = read_config();

        if (! _.has(config, "adapters")) {
            if (! _.has(process.env, "JUTTLE_CLOUDWATCH_CONFIG") ||
                process.env.JUTTLE_CLOUDWATCH_CONFIG === '') {
                throw new Error("To run this test, you must provide the adapter config via the environment as JUTTLE_CLOUDWATCH_CONFIG.");
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

    it(' can read basic info', function() {
        this.timeout(60000);
        return check_juttle({
            program: 'read cloudwatch -from :5 minutes ago: -to :now: product="EC2" | view table'
        })
        .then(function(result) {
            expect(result.errors).to.have.length(0);
            expect(result.warnings).to.have.length(0);
        });
    });
});


