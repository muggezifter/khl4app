var gulp = require('gulp');
var babel = require('gulp-babel');
var sass = require('gulp-sass');

gulp.task("jsx", function(){
    return gulp.src("src/*.jsx")
        .pipe(babel({
            presets: ["es2015","react"]
        }))
        .pipe(gulp.dest("www/js"));
});

gulp.task('sass', function () {
    return gulp.src('src/scss/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('www/css'));
});

gulp.task('watch',function() {
    gulp.watch('src/*.jsx',['jsx']);
    gulp.watch('src/scss/*.scss',['sass']);
});

