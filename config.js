'use strict';

var path = require('path'),
    rootPath = path.normalize(__dirname),
    env = process.env.NODE_ENV || 'development';

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
    title:'洋码头-聚洋货'
}

module.exports = config[env];
