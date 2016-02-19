'use strict';
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
//  - The expression is a variable length list of conditions joined by
//    OR. A condition is a product, a product + metric, a product
//    + item, or a product + metric + item.
//  - A product, metric, or item is expressed using key=value. No comparisons
//    other than '=' between keys and values are allowed.
//  - The possible values for keys are:
//    - 'product': specifying a specific product such as 'EC2', 'ELB',
//                 etc.
//    - 'item': specifying a specific item (i.e. "i-cc696a17" for EC2,
//              "vol-56130db1" for EBS). If any item field is
//              specified, the data returned is CloudWatch metrics for
//              the specified item.
//    - 'metric': specifying a specific metric. If any metric field is
//              specified, only those CloudWatch metrics are returned.
//    - A product + metric can be expressed using AND (product='EC2'
//      AND metric='CPUUtilization') or using a concise format
//      (metric='EC2:CPUUtilization')
//    - AND can only be used to combine one product, one metric, and/or one item.
//    - Other boolean logic is not supported.

var FilterCloudWatchCompiler = ASTVisitor.extend({
    initialize: function(options) {
        this.supported_products = options.supported_products;
    },

    throwUnsupportedFilter(location, filter) {
        throw JuttleErrors.compileError('RT-ADAPTER-UNSUPPORTED-FILTER', {
            proc: 'read cloudwatch',
            filter: filter,
            location: location
        });
    },

    compile: function(node) {
        let conds = this.visit(node);

        return this.merge(conds);
    },

    visitStringLiteral: function(node) {
        return node.value;
    },

    visitSimpleFilterTerm: function(node) {
        this.throwUnsupportedFilter(node.location, 'simple filter terms');
    },

    visitUnaryExpression: function(node) {
        switch (node.operator) {
            // '*' is the field dereferencing operator. For example,
            // given a search string product = 'CloudWatch', the UnaryExpression
            // * on product means 'the field called product'.
            case '*':
                return this.visit(node.expression);

            default:
                this.throwUnsupportedFilter(node.location, 'operator ' + node.operator);
        }
    },

    // Build up a list of conditions that control what metrics to
    // fetch. Each item in the array specifies conditions on:
    //  - product: an AWS product.
    //  - item: a list of item ids.
    //  - metric: a list of metrics to fetch.
    //
    // While parsing the filter expression any of these can not yet
    // defined (undefined for product, an empty array for
    // items/metrics).
    //
    // ANDs are used to combine incomplete conditions and ORs are used
    // to add to the list of conditions.

    visitBinaryExpression: function(node) {
        var left, right, ret;

        switch (node.operator) {

            case 'AND':
                left = this.visit(node.left);
                right = this.visit(node.right);

                // You can only combine single conditions
                if (left.length > 1 || right.length > 1) {
                    this.throwUnsupportedFilter(node.location, 'AND between anything other than simple conditions');
                }
                left = left[0];
                right = right[0];

                // You can only combine items if one of the products/items/metrics
                // is wildcarded (undefined for products, an empty array for items/metrics).
                if (left.product !== undefined &&
                    right.product !== undefined) {
                    this.throwUnsupportedFilter(node.location, 'AND between products');
                }

                if ((left.item.length > 0 && right.item.length > 0)) {
                    this.throwUnsupportedFilter(node.location, 'AND between items');
                }

                if ((left.metric.length > 0 && right.metric.length > 0)) {
                    this.throwUnsupportedFilter(node.location, 'AND between metrics');
                }

                // merge the two halves by combining the objects.
                ret = [{
                    product: (left.product === undefined ? right.product : left.product),
                    metric: _.union(left.metric, right.metric),
                    item: _.union(left.item, right.item),
                }];

                break;

            case 'OR':
                left = this.visit(node.left);
                right = this.visit(node.right);

                // Just concatenate the conditions. We'll try to merge at the end.
                ret = left.concat(right);

                break;

            case '==':
                left = this.visit(node.left);
                right = this.visit(node.right);

                // Left *must* be either 'item', 'product', or
                // 'metric'. When left is 'product', right must be one
                // of the supported AWS products.
                if (left !== 'item' && left !== 'product' && left !== 'metric') {
                    this.throwUnsupportedFilter(node.location, 'condition ' + left);
                }

                // for items/metrics, support a shorthand format '<aws
                // product>:<item name>'. <aws product> must be one of
                // the supported products.
                let product = undefined;
                let value = right;

                if (right.indexOf(':') >= 0) {
                    let parts = right.split(':', 2);
                    product = parts[0];
                    value = parts[1];
                }

                ret = {
                    product: product,
                    item: [],
                    metric: []
                };

                if (left === 'product') {
                    ret.product = value;
                } else {
                    ret[left] = [value];
                }

                // If product was set, it can only be a supported product
                if (ret.product && ! _.contains(this.supported_products, ret.product)) {
                    this.throwUnsupportedFilter(node.location, 'product ' + ret.product);
                }

                ret = [ret];

                break;

            default:
                this.throwUnsupportedFilter(node.location, 'operator ' + node.operator);
        }

        return ret;
    },

    visitExpressionFilterTerm: function(node) {
        return this.visit(node.expression);
    },

    // Not inherited from ASTVisitor below here.
    can_merge(cond1, cond2) {

        // In order to merge, the products must be the same.
        if (cond1.product !== cond2.product) {
            return false;
        }

        // If one condition has a zero-length metric or item list, the
        // other must have a zero length list as well.
        if ((cond1.item.length === 0 && cond2.item.length !== 0) ||
            (cond1.metric.length === 0 && cond2.metric.length !== 0)) {
            return false;
        }

        // It's possible to merge the two conditions if they both have
        // item restrictions or both have metric restrictions, but not
        // a mix.
        if (cond1.item.length + cond2.item.length > 0 &&
            cond1.metric.length + cond2.metric.length > 0) {
            return false;
        }

        // The conditions can be merged.
        return true;
    },

    // Given a list of conditions, try to merge them. This involves
    // finding conditions where the products are the same and the set
    // of metrics/items do not overlap.

    merge(conds) {
        let merged = [];

        if (conds === undefined) {
            return conds;
        }

        for(let cond of conds) {
            let i;
            for(i=0; i < merged.length; i++) {
                if (this.can_merge(merged[i], cond)) {
                    merged[i].item = _.union(merged[i].item, cond.item);
                    merged[i].metric = _.union(merged[i].metric, cond.metric);
                    break;
                }
            }
            if (i === merged.length) {
                // Couldn't merge with any existing condition, just
                // add it to the end.
                merged.push(cond);
            }
        }

        // Once merged, every condition must name a product (e.g. you
        // can't just specify an item or metric).
        for(let cond of conds) {
            if (cond.product === undefined) {
                this.throwUnsupportedFilter(undefined, 'item/metric condition without product');
            }
        }

        return merged;
    },
});

module.exports = FilterCloudWatchCompiler;
