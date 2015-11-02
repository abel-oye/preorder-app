// generated on 2015-10-12 using generator-gulp-webapp 1.0.3
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _gulp = require('gulp');

var _gulp2 = _interopRequireDefault(_gulp);

var _gulpLoadPlugins = require('gulp-load-plugins');

var _gulpLoadPlugins2 = _interopRequireDefault(_gulpLoadPlugins);

var _browserSync = require('browser-sync');

var _browserSync2 = _interopRequireDefault(_browserSync);

var _del = require('del');

var _del2 = _interopRequireDefault(_del);

var $ = (0, _gulpLoadPlugins2['default'])();
var reload = _browserSync2['default'].reload;

var config = {
    src: 'public/', //源文件路径
    dist: 'dist/', //静态资源产物路径
    view: 'views/', //页面路径
    viewOut: 'app/views', //页面处理之后路径
    staticPath: 'http://staitc.preorder.app.ymatou.com', //静态站点host
    cssSrc: ['public/{styles,css}/{,*/}*.scss', '!public/{styles,css}/_*/*']
};

_gulp2['default'].task('styles', function () {
    return _gulp2['default'].src(config.cssSrc).pipe($.plumber()).pipe($.sourcemaps.init()).pipe($.sass.sync({
        outputStyle: 'expanded',
        precision: 10,
        includePaths: ['.']
    }).on('error', $.sass.logError)).pipe($.autoprefixer({
        browsers: ['last 2 version']
    })).pipe($.sourcemaps.write()).pipe(_gulp2['default'].dest('.tmp/')).pipe(reload({
        stream: true
    }));
});

function lint(files, options) {
    return function () {
        return _gulp2['default'].src(files).pipe(reload({
            stream: true,
            once: true
        })).pipe($['if'](!_browserSync2['default'].active, $.eslint.failAfterError()));
    };
}
var testLintOptions = {
    env: {
        mocha: true
    }
};

_gulp2['default'].task('lint', lint(config.src + 'scripts/{,*/}*.js'));
_gulp2['default'].task('lint:test', lint('test/spec/**/*.js', testLintOptions));

_gulp2['default'].task('html', ['styles'], function () {
    var assets = $.useref.assets({
        searchPath: ['.tmp', config.src]
    });

    var excludeHtml = $.filter(['*', '!*.{html}'], {
        restore: true
    });

    return _gulp2['default'].src(config.view + '{,*/}*.html').pipe(assets).pipe($.rev()).pipe($['if']('*.js', $.uglify())).pipe($['if']('*.css', $.minifyCss({
        compatibility: '*'
    }))).pipe(assets.restore()).pipe($.useref()).pipe($.revReplace({
        prefix: config.staticPath
    }))
    //.pipe(excludeHtml)
    .pipe(_gulp2['default'].dest(config.dist))
    //.pipe(excludeHtml.restore)
    .pipe($.filter('*.html')).pipe($.minifyHtml({
        conditionals: true,
        loose: true
    })).pipe(_gulp2['default'].dest(config.viewOut));
});

_gulp2['default'].task('images', function () {
    return _gulp2['default'].src(config.src + 'images/**/*').pipe($['if']($['if'].isFile, $.cache($.imagemin({
        progressive: true,
        interlaced: true,
        // don't remove IDs from SVGs, they are often used
        // as hooks for embedding and styling
        svgoPlugins: [{
            cleanupIDs: false
        }]
    })).on('error', function (err) {
        console.log(err);
        this.end();
    }))).pipe($.rev()).pipe(_gulp2['default'].dest(config.dist + 'images')).pipe($.rev.manifest()).pipe(_gulp2['default'].dest(config.dist + 'rev/images'));
});

_gulp2['default'].task('fonts', function () {
    return _gulp2['default'].src(config.src + 'fonts/**/*').pipe(_gulp2['default'].dest('.tmp/fonts')).pipe($.rev()).pipe(_gulp2['default'].dest(config.dist + 'fonts')).pipe($.rev.manifest()).pipe(_gulp2['default'].dest(config.dist + 'rev/fonts'));
});

_gulp2['default'].task('extras', function () {
    return _gulp2['default'].src([config.view + '/*.*', '!' + config.view + '*.html'], {
        dot: true
    }).pipe(_gulp2['default'].dest('dist'));
});

_gulp2['default'].task('clean', _del2['default'].bind(null, ['.tmp', 'dist']));

_gulp2['default'].task('serve', ['styles', 'fonts'], function () {
    (0, _browserSync2['default'])({
        notify: false,
        port: 9000,
        open: false,
        server: {
            baseDir: ['.tmp', config.src, config.view],
            routes: {
                '/bower_components': 'bower_components'
            }
        }
    });

    _gulp2['default'].watch([config.view + '{**,*}/*.html', config.src + 'scripts/**/*.js', config.src + 'images/**/*', '.tmp/fonts/**/*']).on('change', reload);

    _gulp2['default'].watch(config.src + 'styles/**/*.scss', ['styles']);
    _gulp2['default'].watch(config.src + 'fonts/**/*', ['fonts']);
});

_gulp2['default'].task('serve:dist', function () {
    (0, _browserSync2['default'])({
        notify: false,
        port: 9000,
        server: {
            baseDir: ['dist']
        }
    });
});

_gulp2['default'].task('serve:test', function () {
    (0, _browserSync2['default'])({
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

    _gulp2['default'].watch('test/spec/**/*.js').on('change', reload);
    _gulp2['default'].watch('test/spec/**/*.js', ['lint:test']);
});

_gulp2['default'].task('copy:html', function () {
    _gulp2['default'].src(config.dist + '{**,*}/*.html').pipe(_gulp2['default'].dest(config.viewOut));
});

_gulp2['default'].task('rev', function () {
    return _gulp2['default'].src([config.dist + 'rev/**/*.json', config.dist + 'styles/{,*/}*']).pipe($.revCollector()).pipe(_gulp2['default'].dest(config.dist + 'styles'));
});

_gulp2['default'].task('build', ['lint', 'images', 'fonts', 'extras', 'html'], function () {
    return _gulp2['default'].src(config.dist + '**/*').pipe($.size({
        title: '构建项目',
        gzip: true
    })).on('end', function () {
        _gulp2['default'].start('rev');
    });
});

_gulp2['default'].task('default', ['clean'], function () {
    _gulp2['default'].start('build');
});
