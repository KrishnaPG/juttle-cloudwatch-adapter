# Change Log
This file documents all notable changes to juttle-cloudwatch-adapter. The release numbering uses [semantic versioning](http://semver.org).

## 0.3.0
Released 2016-02-26

### Major Changes
- Update to reflect changes in juttle 0.5.0, including the concept of adapter versioning. This release is compatible with adapter version 0.5.0. [[#7](https://github.com/juttle/juttle-cloudwatch-adapter/pull/7)].

## 0.2.0

### Major Changes
- Modify filtering expression to support metrics in addition to products/items.
- Item/Metric filtering can be expressed using ANDs between products and items/metrics.

## 0.1.2

### Minor Changes
- Lower the severity of some info logs to debug.
- Add a `dimension` column to results that describes the associated item in results.

### Bug Fixes
- Only include metrics for a single dimension, aggregating by item name, and not other dimensions such as EC2 instance type, RDS db type, etc.

## 0.1.1

### Minor Changes
- Minor packaging changes

## 0.1.0

### Major Changes
- Initial version.

### Minor Changes

### Bug Fixes
