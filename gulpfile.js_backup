var gulp = require('gulp');
var browserify = require('browserify');
var source     = require('vinyl-source-stream');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var cssMin = require('gulp-css');
var babel = require('gulp-babel');
var babelify = require("babelify");
var buffer = require('vinyl-buffer');
var imagemin = require('gulp-imagemin');
// var regeneratorRuntime = require('regenerator');

gulp.task('css', function(){
  gulp.src('./src/static/css/index.css')
      .pipe(concat('app.css'))
      .pipe(cssMin())
      .pipe(gulp.dest('./dist/static/css'))
});

gulp.task('browserify', function() {
  return browserify({ entries: ['./src/static/js/index.js', './src/static/js/classlist-polyfill.js'] }).transform(babelify.configure({
      presets: ["env"]
    }))
    .bundle().on('error', function(e){
      console.log(e);
    })
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest('./dist/static/js/'))
});

gulp.task('imgs', function() {
  return gulp.src('./src/static/img/*')
  .pipe(imagemin({ 
    progessive: true,
  }))
  .pipe(gulp.dest('./dist/static/img/'));
});

gulp.task('watch', function(){
  gulp.watch('./src/static/js/index.js', ['browserify'])
});

gulp.task('copyHtml', function(){
  gulp.src(['./src/index.html', './src/templates/'])
  .pipe(gulp.dest('./dist/'));
})

gulp.task('default', ['css','browserify', 'imgs', 'copyHtml']);