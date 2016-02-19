'use strict';
var JuttleParser = require('juttle/lib/parser');
var SemanticPass = require('juttle/lib/compiler/semantic');
var JuttleErrors = require('juttle/lib/errors');
var JuttleMoment = require('juttle/lib/moment').JuttleMoment;
var FilterCloudWatchCompiler = require('../lib/filter-cloudwatch-compiler');
var expect = require('chai').expect;

function verify_compile_error(source, filter) {
    var ast = JuttleParser.parseFilter(source).ast;

    var semantic = new SemanticPass({ now: new JuttleMoment() });
    semantic.sa_expr(ast);

    var compiler = compiler || new FilterCloudWatchCompiler({
        supported_products: ['EC2', 'EBS', 'RDS']
    });

    try {
        compiler.compile(ast);
        throw new Error('Compile succeeded when it should have failed');
    } catch (e) {
        expect(e).to.be.instanceOf(JuttleErrors.CompileError);
        expect(e.code).to.equal('RT-ADAPTER-UNSUPPORTED-FILTER');
        expect(e.info.filter).to.equal(filter);
    }
}

function verify_compile_success(source, expected) {
    var ast = JuttleParser.parseFilter(source).ast;

    var semantic = new SemanticPass({ now: new JuttleMoment() });
    semantic.sa_expr(ast);

    var compiler = new FilterCloudWatchCompiler({
        supported_products: ['EC2', 'EBS', 'RDS']
    });

    var search_expr = compiler.compile(ast);
    expect(search_expr).to.deep.equal(expected);
}

describe('aws filter', function() {

    describe('properly returns errors for invalid filtering expressions like', function() {

        var invalid_unary_operators = ['!', '-'];

        invalid_unary_operators.forEach(function(op) {
            it('using unary operator ' + op + ' in field specifications', function() {
                verify_compile_error('product = ' + op + ' "foo"',
                                     'operator ' + op);
            });
        });

        var invalid_operators = ['=~', '!~', '<', '<=', '>', '>=', 'in'];
        invalid_operators.forEach(function(op) {
            it('using ' + op + ' in field comparisons', function() {
                verify_compile_error('product ' + op + ' "foo"',
                                     'operator ' + op);
            });
        });

        it('Combining products with AND', function() {
            verify_compile_error('product="EC2" AND product="EBS"',
                                 'AND between products');
        });

        it('Combining items with AND', function() {
            verify_compile_error('product="EC2" AND item="i-cb955911" AND item="i-966a694d"',
                                 'AND between items');
        });

        it('Combining items with AND (using concise item notation)', function() {
            verify_compile_error('item="EC2:i-cb955911" AND item="EC2:i-966a694d"',
                                 'AND between products');
        });

        it('Combining product and item with AND', function() {
            verify_compile_error('product="EC2" AND item="EC2:i-cb955911"',
                                 'AND between products');
        });

        it('Combining product and item with AND (different products)', function() {
            verify_compile_error('product="EC2" AND item="EBS:vol-56130db1"',
                                 'AND between products');
        });

        it('Combining product and metric with AND', function() {
            verify_compile_error('product="EC2" AND metric="EC2:DiskReadBytes"',
                                 'AND between products');
        });

        it('Combining product and metric with AND (different products)', function() {
            verify_compile_error('product="EC2" AND metric="EBS:DiskReadBytes"',
                                 'AND between products');
        });

        it('Combining product, metric and item with AND (different products)', function() {
            verify_compile_error('product="EBS" AND metric="DiskReadBytes" and item="EC2:i-cb955911"',
                                 'AND between products');
        });

        it('Combining metrics with AND', function() {
            verify_compile_error('product="EC2" AND metric="CPUUtilization" AND metric="DiskReadOps"',
                                 'AND between metrics');
        });

        it('Combining metrics with AND (concise notation)', function() {
            verify_compile_error('metric="EC2:CPUUtilization" AND metric="EC2:DiskReadOps"',
                                 'AND between products');
        });

        it('Combining groups of ORs with AND (on one side)', function() {
            verify_compile_error('(product="EC2" OR product="EBS") AND product="RDS"',
                                 'AND between anything other than simple conditions');
        });

        it('Combining groups of ORs with AND (on both sides)', function() {
            verify_compile_error('(product="EC2" OR product="EBS") AND (product="RDS" OR product="EC2")',
                                 'AND between anything other than simple conditions');
        });

        it('Nested ANDs and ORs)', function() {
            verify_compile_error('(metric="DiskReadBytes" OR metric="DiskWriteBytes") AND (metric="NetworkIn" OR metric="NetworkOut")',
                                 'AND between anything other than simple conditions');
        });

        it('Combining groups of item ORs with AND)', function() {
            verify_compile_error('(item="i-cb955911" OR item="i-11cb9559") AND (item="i-cc696a17" OR item="i-17cc696a")',
                                 'AND between anything other than simple conditions');
        });

        it('Combining nested groups of ORs with AND', function() {
            verify_compile_error('((product="EC2" AND item="i-cb955911") OR (product="EC2" and item="i-11cb9559")) AND ((product="RDS" AND item="db-production") OR (product="EBS" and metric="DiskWriteBytes"))',
                                 'AND between anything other than simple conditions');
        });

        it('Using NOT on a term', function() {
            verify_compile_error('NOT product="EC2"',
                                 'operator NOT');
        });

        it('A filter term not containing "item" or "product"', function() {
            verify_compile_error('foo="EC2"',
                                 'condition foo');
        });

        it('matching on unsupported products', function() {
            verify_compile_error('product = "Lambda"',
                                 'product Lambda');
        });

        it('item in filter without any corresponding product', function() {
            verify_compile_error('item = "i-cb955911"',
                                 'item/metric condition without product');
        });

        it('metric in filter without any corresponding product', function() {
            verify_compile_error('metric = "DiskReadBytes"',
                                 'item/metric condition without product');
        });

        it('item in filter for unsupported product', function() {
            verify_compile_error('item = "NOPRODUCT:i-cb955911"',
                                 'product NOPRODUCT');
        });

        it('a single filter expression', function() {
            verify_compile_error('\"foo\"',
                                 'simple filter terms');
        });

        it('not a filter expression or string', function() {
            verify_compile_error('+ 1',
                                 'simple filter terms');
        });
    });

    describe('properly returns condition lists for valid cases like', function() {
        it('Single product match', function() {
            verify_compile_success('product="EC2"', [{
                product: 'EC2',
                item: [],
                metric: []
            }]);
        });

        it('Multiple product matches', function() {
            verify_compile_success('product="EC2" OR product="EBS"', [
                {
                    product: 'EC2',
                    item: [],
                    metric: []
                },
                {
                    product: 'EBS',
                    item: [],
                    metric: []
                }
            ]);
        });

        it('Multiple product matches w/ duplicates', function() {
            verify_compile_success('product="EC2" OR product="EC2"', [
                {
                    product: 'EC2',
                    item: [],
                    metric: []
                },
            ]);
        });

        it('Multiple product matches, not adjacent', function() {
            verify_compile_success('product="EC2" OR product="EBS" OR product="EC2"', [
                {
                    product: 'EC2',
                    item: [],
                    metric: []
                },
                {
                    product: 'EBS',
                    item: [],
                    metric: []
                },
            ]);
        });

        it('Single item match', function() {
            verify_compile_success('item="EC2:i-cc696a17"', [
                {
                    product: 'EC2',
                    item: ['i-cc696a17'],
                    metric: []
                }
            ]);
        });

        it('Multiple item matches', function() {
            verify_compile_success('item="EC2:i-cc696a17" OR item="EBS:vol-56130db1"', [
                {
                    product: 'EC2',
                    item: ['i-cc696a17'],
                    metric: []
                },
                {
                    product: 'EBS',
                    item: ['vol-56130db1'],
                    metric: []
                }
            ]);
        });

        it('Multiple item matches for same product', function() {
            verify_compile_success('item="EC2:i-cc696a17" OR item="EC2:i-966a694d"', [
                {
                    product: 'EC2',
                    item: ['i-cc696a17', 'i-966a694d'],
                    metric: []
                }
            ]);
        });

        it('Multiple item matches with duplicates', function() {
            verify_compile_success('item="EC2:i-cc696a17" OR item="EC2:i-cc696a17"', [
                {
                    product: 'EC2',
                    item: ['i-cc696a17'],
                    metric: []
                }
            ]);
        });

        it('Single metric match', function() {
            verify_compile_success('metric="EC2:CPUUtilization"', [
                {
                    product: 'EC2',
                    item: [],
                    metric: ['CPUUtilization']
                }
            ]);
        });

        it('Multiple metric matches', function() {
            verify_compile_success('metric="EC2:CPUUtilization" OR metric="EBS:VolumeReadBytes"', [
                {
                    product: 'EC2',
                    item: [],
                    metric: ['CPUUtilization']
                },
                {
                    product: 'EBS',
                    item: [],
                    metric: ['VolumeReadBytes']
                }
            ]);

        });

        it('Multiple metric matches for same product', function() {
            verify_compile_success('metric="EC2:CPUUtilization" OR metric="EC2:DiskReadOps"', [
                {
                    product: 'EC2',
                    item: [],
                    metric: ['CPUUtilization', 'DiskReadOps']
                }
            ]);
        });

        it('Multiple item matches with duplicates', function() {
            verify_compile_success('metric="EC2:CPUUtilization" OR metric="EC2:CPUUtilization"', [
                {
                    product: 'EC2',
                    item: [],
                    metric: ['CPUUtilization']
                }
            ]);
        });

        it('Combining product and metrics with AND', function() {
            verify_compile_success('product="EC2" AND metric="DiskReadOps"', [
                {
                    product: 'EC2',
                    item: [],
                    metric: ['DiskReadOps']
                }
            ]);
        });

        it('Combining products, metrics, and items with AND', function() {
            verify_compile_success('product="EC2" AND item="i-cb955911" AND metric="DiskReadOps"', [
                {
                    product: 'EC2',
                    item: ['i-cb955911'],
                    metric: ['DiskReadOps']
                }
            ]);
        });

        it('Combining products, metrics, and items with AND (concise notation)', function() {
            verify_compile_success('item="EC2:i-cb955911" AND metric="DiskReadOps"', [
                {
                    product: 'EC2',
                    item: ['i-cb955911'],
                    metric: ['DiskReadOps']
                }
            ]);
        });

        it('Combining products, metrics, and items with AND, along with unrelated products', function() {
            verify_compile_success('item="EC2:i-cb955911" AND metric="DiskReadOps" OR product="EBS" OR product="RDS"', [
                {
                    product: 'EC2',
                    item: ['i-cb955911'],
                    metric: ['DiskReadOps']
                },
                {
                    product: 'EBS',
                    item: [],
                    metric: []
                },
                {
                    product: 'RDS',
                    item: [],
                    metric: []
                }
            ]);
        });

        it('Combining groups of products/metrics/items combined with AND', function() {
            verify_compile_success('(product="EC2" AND item="i-cb955911" AND metric="DiskReadOps") OR (product="EBS" and metric="DiskWriteBytes") OR (product="RDS" and item="db-production")', [
                {
                    product: 'EC2',
                    item: ['i-cb955911'],
                    metric: ['DiskReadOps']
                },
                {
                    product: 'EBS',
                    item: [],
                    metric: ['DiskWriteBytes']
                },
                {
                    product: 'RDS',
                    item: ['db-production'],
                    metric: []
                }
            ]);
        });

        it('Separate product items can be merged', function() {
            verify_compile_success('(product="EC2" AND item="i-cb955911") OR product="RDS" OR (product="EC2" AND item="i-cc696a17")', [
                {
                    product: 'EC2',
                    item: ['i-cb955911', 'i-cc696a17'],
                    metric: []
                },
                {
                    product: 'RDS',
                    item: [],
                    metric: []
                }
            ]);
        });

        it('Single and wildcard product items will not be merged', function() {
            verify_compile_success('product="EC2" OR product="RDS" OR (product="EC2" AND item="i-cc696a17")', [
                {
                    product: 'EC2',
                    item: [],
                    metric: []
                },
                {
                    product: 'RDS',
                    item: [],
                    metric: []
                },
                {
                    product: 'EC2',
                    item: ['i-cc696a17'],
                    metric: []
                },
            ]);
        });

        it('Single and wildcard product metrics will not be merged', function() {
            verify_compile_success('product="EC2" OR product="RDS" OR (product="EC2" AND metric="CPUUtilization")', [
                {
                    product: 'EC2',
                    item: [],
                    metric: []
                },
                {
                    product: 'RDS',
                    item: [],
                    metric: []
                },
                {
                    product: 'EC2',
                    item: [],
                    metric: ['CPUUtilization']
                },
            ]);
        });

        it('Separate product metrics can be merged', function() {
            verify_compile_success('(product="EBS" AND metric="DiskReadBytes") OR product="EC2" OR (product="EBS" AND metric="DiskWriteBytes")', [
                {
                    product: 'EBS',
                    item: [],
                    metric: ['DiskReadBytes', 'DiskWriteBytes']
                },
                {
                    product: 'EC2',
                    item: [],
                    metric: []
                }
            ]);
        });

        it('Separate product items/metric conditions will not be merged', function() {
            verify_compile_success('(product="EC2" AND item="i-cb955911") OR product="RDS" OR (product="EC2" AND metric="CPUUtilization")', [
                {
                    product: 'EC2',
                    item: ['i-cb955911'],
                    metric: []
                },
                {
                    product: 'RDS',
                    item: [],
                    metric: []
                },
                {
                    product: 'EC2',
                    item: [],
                    metric: ['CPUUtilization']
                }
            ]);
        });

        it('Mix of item and product matches', function() {
            verify_compile_success('product="EC2" OR product="EBS" OR item="EC2:i-cc696a17" OR item="EC2:i-966a694d" OR item="EBS:vol-56130db1" OR product="RDS"', [
                {
                    product: 'EC2',
                    item: [],
                    metric: []
                },
                {
                    product: 'EBS',
                    item: [],
                    metric: []
                },
                {
                    product: 'EC2',
                    item: ['i-cc696a17', 'i-966a694d'],
                    metric: []
                },
                {
                    product: 'EBS',
                    item: ['vol-56130db1'],
                    metric: []
                },
                {
                    product: 'RDS',
                    item: [],
                    metric: []
                }
            ]);
        });

    });
});
