'use strict';

var path = require('path'),
    rootPath = path.normalize(__dirname),
    env = process.env.NODE_ENV || 'production';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'settle-app'
    },
    port: 3400,
    viewPath:rootPath+'/views/'
  },

  sit: {
    root: rootPath,
    app: {
      name: 'settle-app'
    },
    port: 3400,
    viewPath:rootPath+rootPath+'/app/views/'
  },

  production: {
    root: rootPath,
    app: {
      name: 'settle-app'
    },
    port: 3400,
    viewPath:rootPath+'/app/views/'
  }
};

config[env].params = {
    title:'洋码头-聚洋货',
}

config[env].monitorConfig = {
   appId:'preorder.app.ymatou.com',        //项目名
   host: '172.16.100.13',           //提交到服务器地址 //10.10.15.239
   port:8089,                             //提交到服务器端口 //9095
   path:'/api/perfmon/',              //提交到服务器路径
   open:true,                             //是否开启
   loopTime:3000                   //上传耗时间隔  Default:30s
}

module.exports = config[env];
