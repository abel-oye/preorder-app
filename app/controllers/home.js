/**
 *
 */
'use strict';

var express = require('express'),
  router = express.Router(),
  config = require('../../config'),
  utils = require('../utils');

module.exports = function (app) {
    app.use('/', router);

    app.get('/hb.html',function(req,res){
      res.send('ok');
    });

    app.use(function (req, res) {
      res.status(404).format({
        html: function() {
          res.send(req.url);
        }
      });
    });

};

//主页
router.get('/index', function (req, res, next) {
    var data = utils.extends({},config.params);
    res.render('index', data);
});

