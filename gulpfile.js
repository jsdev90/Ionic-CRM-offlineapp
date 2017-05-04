var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sh = require('shelljs');
var ngmin = require('gulp-ngmin');
var uglify = require('gulp-uglify');

var paths = {
    sass: ['./scss/**/*.scss', './www/css/*.scss'],
    js: ['./www/js/**/**/*.js', '!./www/js/**/tests/*.js']

};

gulp.task('default', ['minify-scripts', 'watch']);

gulp.task('minify-scripts', function () {
    try {
        return gulp.src(paths.js)
            .pipe(concat('all.js'))
            .pipe(gulp.dest('./www/dist/'));
    }
    catch (e) {
        console.warn(e);
    }
});

gulp.task('sass', function (done) {
    gulp.src(paths.sass)
        .pipe(sass())
        .on('error', sass.logError)
        .pipe(concat('all.css'))
        .pipe(gulp.dest('./www/dist/'))
        .pipe(minifyCss({
            keepSpecialComments: 0
        }))
        .pipe(rename({extname: '.min.css'}))
        .pipe(gulp.dest('./www/dist/'))
        .on('end', done);
});

gulp.task('watch', function () {
    gulp.watch(paths.sass, ['sass']);
    gulp.watch(paths.js, ['minify-scripts']);
});

gulp.task('install', ['git-check'], function () {
    return bower.commands.install()
        .on('log', function (data) {
            gutil.log('bower', gutil.colors.cyan(data.id), data.message);
        });
});

gulp.task('git-check', function (done) {
    if (!sh.which('git')) {
        console.log(
            '  ' + gutil.colors.red('Git is not installed.'),
            '\n  Git, the version control system, is required to download Ionic.',
            '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
            '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
        );
        process.exit(1);
    }
    done();
});
