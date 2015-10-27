# settle.app.ymatou.com 移动端结算系统
## 一键购买、购物车、结算等功能 

settle.app使用是express

static通过gulp来构建。

将es6的gulp task 脚本转换成es5的脚本执行。
    默认优先执行gulp.babel.js,然后再执行gulpfile.babel.js；
    经验证在自动发布中es5的整个执行时间短

```javascript
babel gulpfile.babel.js -o gulpfile.js
```

## History
    * 2015-10-27 创建项目 
    
## License

MIT
