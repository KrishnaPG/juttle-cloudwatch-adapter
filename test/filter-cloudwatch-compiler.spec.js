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

    describe(' properly returns errors for invalid filtering expressions like ', function() {

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

        it('Combining terms with AND', function() {
            verify_compile_error('product="EC2" AND product="EBS"',
                                 'operator AND');
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
            verify_compile_error('product = "RDS"',
                                 'product RDS');
        });

        it('item in filter not having format <aws product>:<item name>', function() {
            verify_compile_error('item = "i-cb955911"',
                                 'item value not having format <aws product>:<item name>');
        });

        it('item in filter for unsupported product', function() {
            verify_compile_error('item = "NOPRODUCT:i-cb955911"',
                                 'product NOPRODUCT');
        });

        it('a single filter expression', function() {
            verify_compile_error('\"foo\"',
                                 'filter term UnaryExpression');
        });

        it('not a filter expression or string', function() {
            verify_compile_error('+ 1',
                                 'operator +');
        });
    });

    describe(' properly returns condition lists for valid cases like ', function() {
        it('Single product match', function() {
            verify_compile_success('product="EC2"', {
                EC2: []
            });
        });

        it('Multiple product matches', function() {
            verify_compile_success('product="EC2" OR product="EBS"', {
                EC2: [],
                EBS: []
            });
        });

        it('Multiple product matches w/ duplicates', function() {
            verify_compile_success('product="EC2" OR product="EC2"', {
                EC2: []
            });
        });

        it('Single item match', function() {
            verify_compile_success('item="EC2:i-cc696a17"', {
                EC2: ['i-cc696a17']
            });
        });

        it('Multiple item matches', function() {
            verify_compile_success('item="EC2:i-cc696a17" OR item="EBS:vol-56130db1"', {
                EBS: ['vol-56130db1'],
                EC2: ['i-cc696a17']
            });
        });

        it('Multiple item matches for same product', function() {
            verify_compile_success('item="EC2:i-cc696a17" OR item="EC2:i-966a694d"', {
                EC2: ['i-cc696a17', 'i-966a694d']
            });
        });

        it('Multiple item matches with duplicates', function() {
            verify_compile_success('item="EC2:i-cc696a17" OR item="EC2:i-cc696a17"', {
                EC2: ['i-cc696a17']
            });
        });

        it('Mix of item and product matches', function() {
            verify_compile_success('product="EC2" OR product="EBS" OR item="EC2:i-cc696a17" OR item="EC2:i-966a694d" OR item="EBS:vol-56130db1" OR product="RDS"', {
                EBS: ['vol-56130db1'],
                EC2: ['i-cc696a17', 'i-966a694d'],
                RDS: []
            });
        });

    });
});
