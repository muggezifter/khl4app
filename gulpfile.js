var gulp = require('gulp');
var sass = require('gulp-sass');
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var uglify = require('gulp-uglify');
var pump = require('pump');
var concat = require('gulp-concat');

gulp.task('watch',function() {
    gulp.watch('src/*.jsx',['jsx']);
    gulp.watch('src/scss/*.scss',['sass']);
});

gulp.task('sass', function () {
    return gulp.src('src/scss/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('www/css'));
});


gulp.task('jsx',['bundle','compress-js']);

gulp.task('bundle', function() {
    return browserify({
        extensions: ['.jsx','js'],
        entries: 'src/app.jsx',
    })
    .transform(babelify.configure({
        presets: ["es2015","react"]
    }))
    .bundle()
    .on("error", function (err) { console.log("Error : " + err.message); })
    .pipe(source('bundle.js'))
    .pipe(gulp.dest('src/bundle'));
});


gulp.task('compress-js', function (cb) {
  pump([
        gulp.src('src/bundle/bundle.js'),
        uglify(),
        concat('bundle.min.js'),
        gulp.dest('www/js')
    ],
    cb
  );
});
