/* eslint-disable strict, import/no-extraneous-dependencies */

'use strict';

const gulp = require('gulp-task-doc');

gulp.task('help', gulp.help());
gulp.task('default', ['help']);

require('./gulp/bump');
require('./gulp/install');
require('./gulp/svg/index');