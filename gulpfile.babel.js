// generated on 2015-10-12 using generator-gulp-webapp 1.0.3
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import browserSync from 'browser-sync';
import del from 'del';


const $ = gulpLoadPlugins();
const reload = browserSync.reload;

const config = {
    src: 'public/',//源文件路径
    dist: 'dist/',//静态资源产物路径
    view: 'views/',//页面路径
    viewOut:'app/views',//页面处理之后路径
    staticPath:'http://staitc.settle.app.ymatou.com/',//静态站点host
    cssSrc: [
        'public/{styles,css}/{,*/}*.scss',
        '!public/{styles,css}/_*/*'
    ]
}

gulp.task('styles', () => {
    return gulp.src(config.cssSrc)
        .pipe($.plumber())
        .pipe($.sourcemaps.init())
        .pipe($.sass.sync({
            outputStyle: 'expanded',
            precision: 10,
            includePaths: ['.']
        }).on('error', $.sass.logError))
        .pipe($.autoprefixer({
            browsers: ['last 2 version']
        }))
        .pipe($.sourcemaps.write())
        .pipe(gulp.dest('.tmp/'))
        .pipe(reload({
            stream: true
        }));
});

function lint(files, options) {
    return () => {
        return gulp.src(files)
            .pipe(reload({
                stream: true,
                once: true
            }))
            .pipe($.if(!browserSync.active, $.eslint.failAfterError()));
    };
}
const testLintOptions = {
    env: {
        mocha: true
    }
};

gulp.task('lint', lint(config.src+'scripts/{,*/}*.js'));
gulp.task('lint:test', lint('test/spec/**/*.js', testLintOptions));

gulp.task('html', ['styles'], () => {
    const assets = $.useref.assets({
        searchPath: ['.tmp', config.src ]
    });

    const excludeHtml = $.filter(['!*.html'],{
        restore:true
    });

    return gulp.src(config.view+'{,*/}*.html')
        .pipe(assets)
        .pipe($.rev())
        .pipe($.if('*.js', $.uglify()))
        .pipe($.if('*.css',$.minifyCss({
            compatibility: '*'
        })))
        .pipe(assets.restore())
        .pipe($.useref())
        .pipe($.revReplace({
            prefix:config.staticPath
        }))
        .pipe(excludeHtml)
        .pipe(gulp.dest(config.dist))
        .pipe(excludeHtml.restore)
        .pipe($.filter('*.html'))
        .pipe($.minifyHtml({
            conditionals: true,
            loose: true
        }))
        .pipe(gulp.dest(config.viewOut));
});

gulp.task('images', () => {
    return gulp.src(config.src+'images/**/*')
        .pipe($.if($.if.isFile, $.cache($.imagemin({
                progressive: true,
                interlaced: true,
                // don't remove IDs from SVGs, they are often used
                // as hooks for embedding and styling
                svgoPlugins: [{
                    cleanupIDs: false
                }]
            }))
            .on('error', function (err) {
                console.log(err);
                this.end();
            })))
        .pipe($.rev())
        .pipe(gulp.dest(config.dist+'images'))
        .pipe($.rev.manifest())
        .pipe(gulp.dest(config.dist+'rev/images'))
});

gulp.task('fonts', () => {
    return gulp.src(config.src+'fonts/**/*')
        .pipe(gulp.dest('.tmp/fonts'))
        .pipe($.rev())
        .pipe(gulp.dest(config.dist+'fonts'))
        .pipe($.rev.manifest())
        .pipe(gulp.dest(config.dist+'rev/fonts'))
});

gulp.task('extras', () => {
    return gulp.src([
        config.view+'/*.*',
        '!'+config.view+'*.html'
    ], {
        dot: true
    }).pipe(gulp.dest('dist'));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('serve', ['styles', 'fonts'], () => {
    browserSync({
        notify: false,
        port: 9000,
        open: false,
        server: {
            baseDir: ['.tmp', config.src , config.view ],
            routes: {
                '/bower_components': 'bower_components'
            }
        }
    });

    gulp.watch([
        config.view+'{**,*}/*.html',
        config.src+'scripts/**/*.js',
        config.src+'images/**/*',
        '.tmp/fonts/**/*'
    ]).on('change', reload);

    gulp.watch(config.src+'styles/**/*.scss', ['styles']);
    gulp.watch(config.src+'fonts/**/*', ['fonts']);
});

gulp.task('serve:dist', () => {
    browserSync({
        notify: false,
        port: 9000,
        server: {
            baseDir: ['dist']
        }
    });
});

gulp.task('serve:test', () => {
    browserSync({
        notify: false,
        port: 9000,
        ui: false,
        server: {
            baseDir: 'test',
            routes: {
                '/bower_components': 'bower_components'
            }
        }
    });

    gulp.watch('test/spec/**/*.js').on('change', reload);
    gulp.watch('test/spec/**/*.js', ['lint:test']);
});

gulp.task('copy:html', () => {
    gulp.src(config.dist+'{**,*}/*.html')
      .pipe(gulp.dest(config.viewOut));
});

gulp.task('rev', () => {
    return gulp.src([config.dist+'rev/**/*.json', config.dist+'styles/{,*/}*'])
        .pipe($.revCollector())
        .pipe(gulp.dest(config.dist+'styles'));
});

gulp.task('build', ['lint', 'images', 'fonts', 'extras', 'html'], () => {
    return gulp.src(config.dist+'**/*').pipe($.size({
        title: '构建项目',
        gzip: true
    })).on('end', () => {
        gulp.start('rev');
    });
});

gulp.task('default', ['clean'], () => {
    gulp.start('build');
});
