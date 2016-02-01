// Compiler that transforms a filter expression AST into an array of
// conditions that control what metrics to fetch.
//
// The expression is returned from the compile method.

var ASTVisitor = require('juttle/lib/compiler/ast-visitor');
var JuttleErrors = require('juttle/lib/errors');
var _ = require('underscore');

// FilterCloudWatchCompiler derives from ASTVisitor which provides a way to
// traverse the abstract syntax tree that the juttle compiler
// generates for the read command's filter expression.
//
// While traversing the tree, callbacks are called for the various
// parts of the filter expression. The FilterCloudWatchCompiler object
// maps individual items in the tree into an array of conditions that
// control what metrics to fetch.
//
// Here's the supported filtering expression:
//  The expression can be a variable length list of simple key=value
//      pairs, separated by OR.
//    - No other boolean logic (ANDs, NOT, etc) is allowed.
//    - No comparisons other than '=' between keys and
//      values are allowed.
//  The possible values for keys can be:
//    - 'product': specifying a specific product such as 'EC2', 'ELB',
//                 etc.  If multiple products are specified, the
//                 adapter fetches information for both sets of
//                 products.
//    - 'item': specifying a specific item. This should be expressed
//              as '<product>:<item name>', for example
//              'EC2:i-ca915d10', 'EBS:vol-7e9cf971', etc. If any item
//              field is specified, the data returned is CloudWatch
//              metrics for the specified item.

var FilterCloudWatchCompiler = ASTVisitor.extend({
    initialize: function(options) {
        this.supported_products = options.supported_products;
    },

    compile: function(node) {
        return this.visit(node);
    },

    visitStringLiteral: function(node) {
        return node.value;
    },

    visitUnaryExpression: function(node) {
        switch (node.operator) {
            // '*' is the field dereferencing operator. For example,
            // given a search string product = 'CloudWatch', the UnaryExpression
            // * on product means 'the field called product'.
            case '*':
                return this.visit(node.expression);

            default:

                throw JuttleErrors.compileError('RT-ADAPTER-UNSUPPORTED-FILTER', {
                    proc: 'read cloudwatch',
                    filter: 'operator ' + node.operator,
                    location: node.location
                });
        }
    },

    visitBinaryExpression: function(node) {
        var left, right, ret;

        switch (node.operator) {

            case 'OR':
                left = this.visit(node.left);
                right = this.visit(node.right);

                ret = _.extend({}, right, left);

                // The extend() didn't actually handle the case where
                // left and right both had a value for the same key.
                // Handle that here by merging the two arrays.
                ret = _.mapObject(ret, function(val, key) {
                    return _.union(val, right[key]);
                });

                return ret;

            case '==':
                left = this.visit(node.left);
                right = this.visit(node.right);

                // Left *must* be either 'item' or 'product'. When
                // left is 'product', right must be one of the
                // supported AWS products.
                if (left !== 'item' && left !== 'product') {
                    throw JuttleErrors.compileError('RT-ADAPTER-UNSUPPORTED-FILTER', {
                        proc: 'read cloudwatch',
                        filter: 'condition ' + left,
                        location: node.location
                    });
                }

                if (left === 'product') {
                    if (! _.contains(this.supported_products, right)) {
                        throw JuttleErrors.compileError('RT-ADAPTER-UNSUPPORTED-FILTER', {
                            proc: 'read cloudwatch',
                            filter: 'product ' + right,
                            location: node.location
                        });
                    }

                    ret = {};
                    ret[right] = [];
                    return ret;

                } else {

                    // Item values must have a specific format '<aws
                    // product>:<item name>', so ensure that there
                    // is an <aws product> and that it matches one of
                    // the supported products.
                    if (right.indexOf(':') === -1) {
                        throw JuttleErrors.compileError('RT-ADAPTER-UNSUPPORTED-FILTER', {
                            proc: 'read cloudwatch',
                            filter: 'item value not having format <aws product>:<item name>',
                            location: node.location
                        });
                    }

                    var parts = right.split(':', 2);
                    var product = parts[0];
                    var item = parts[1];

                    if (! _.contains(this.supported_products, product)) {
                        throw JuttleErrors.compileError('RT-ADAPTER-UNSUPPORTED-FILTER', {
                            proc: 'read cloudwatch',
                            filter: 'product ' + product,
                            location: node.location});
                    }

                    ret = {};
                    ret[product] = [item];
                    return ret;
                }

                break;

            default:
                throw JuttleErrors.compileError('RT-ADAPTER-UNSUPPORTED-FILTER', {
                    proc: 'read cloudwatch',
                    filter: 'operator ' + node.operator,
                    location: node.location
                });
        }
    },

    visitExpressionFilterTerm: function(node) {
        return this.visit(node.expression);
    }
});

module.exports = FilterCloudWatchCompiler;
