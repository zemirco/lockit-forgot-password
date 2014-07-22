
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var favicon = require('static-favicon');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');
var csrf = require('csurf');
var errorHandler = require('errorhandler');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var fs = require('fs');
var lockitUtils = require('lockit-utils');
var ForgotPassword = require('../../index.js');

function start(config) {

  config = config || require('./config.js');

  var app = express();

// set basedir so views can properly extend layout.jade
  app.locals.basedir = __dirname + '/views'; // comment out and error returns
  app.set('port', process.env.PORT || config.port || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  // make JSON output simpler for testing
  app.set('json spaces', 0);
  app.use(favicon());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded());
  app.use(cookieParser());
  app.use(cookieSession({
    secret: 'this is my super secret string'
  }));
  app.use(express.static(path.join(__dirname, 'public')));

  if (config.csrf) {
    app.use(csrf());
    app.use(function(req, res, next) {

      var token = req.csrfToken();
      res.locals._csrf = token;

      // save token to a cookie so we can easily access it on the client
      res.cookie('csrf', token);
      next();
    });
  }

  // set a dummy session for testing purpose
  app.use(function(req, res, next) {
    req.session.username = 'john';
    next();
  });

  // use forgot password middleware with testing options
  var db = lockitUtils.getDatabase(config);
  var adapter = require(db.adapter)(config);
  var forgotPassword = new ForgotPassword(config, adapter);

  // expose login and adapter for testing
  app._forgotPassword = forgotPassword;
  app._adapter = adapter;

  app.use(forgotPassword.router);

  // development only
  if ('development' == app.get('env')) {
    app.use(errorHandler());
  }

  app.get('/', routes.index);
  app.get('/users', user.list);

  http.createServer(app).listen(app.get('port'));

  return app;

}

// export app for testing
if(require.main === module){
  // called directly
  start();
} else {
  // required as a module -> from test file
  module.exports = function(config) {
    return start(config);
  };
}
