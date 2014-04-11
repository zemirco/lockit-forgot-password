
var path = require('path');
var uuid = require('node-uuid');
var pwd = require('couch-pwd');
var ms = require('ms');
var moment = require('moment');

/**
 * Internal helper functions
 */

function join(view) {
  return path.join(__dirname, 'views', view);
}

/**
 * Let's get serious
 */

module.exports = function(app, config, adapter) {

  var Mail = require('lockit-sendmail')(config);

  // shorten config
  var cfg = config.forgotPassword;

  // set default route
  var route = cfg.route || '/forgot-password';

  // add prefix when rest is active
  if (config.rest) route = '/rest' + route;

  /**
   * Routes
   */

  app.get(route, getForgot);
  app.post(route, postForgot);
  app.get(route + '/:token', getToken);
  app.post(route + '/:token', postToken);

  /**
   * Route handlers
   */

  // GET /forgot-password
  function getForgot(req, res, next) {

    // do not handle the route when REST is active
    if (config.rest) return next();

    // custom or built-in view
    var view = cfg.views.forgotPassword || join('get-forgot-password');

    res.render(view, {
      title: 'Forgot password'
    });
  }

  // POST /forgot-password
  function postForgot(req, response) {
    var email = req.body.email;

    var error = null;
    // regexp from https://github.com/angular/angular.js/blob/master/src/ng/directive/input.js#L4
    var EMAIL_REGEXP = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,6}$/;

    // check for valid input
    if (!email || !email.match(EMAIL_REGEXP)) {
      error = 'Email is invalid';

      // send only JSON when REST is active
      if (config.rest) return response.json(403, {error: error});

      // custom or built-in view
      var errorView = cfg.views.forgotPassword || join('get-forgot-password');

      response.status(403);
      response.render(errorView, {
        title: 'Forgot password',
        error: error
      });
      return;
    }

    // looks like given email address has the correct format

    // look for user in db
    adapter.find('email', email, function(err, user) {
      if (err) console.log(err);

      // custom or built-in view
      var view = cfg.views.sentEmail || join('post-forgot-password');

      // no user found -> pretend we sent an email
      if (!user) {
        // send only JSON when REST is active
        if (config.rest) return response.send(204);

        response.render(view, {
          title: 'Forgot password'
        });
        return;
      }

      // user found in db
      // do not delete old password as it might be someone else
      // send link with setting new password page
      var token = uuid.v4();
      user.pwdResetToken = token;

      // set expiration date for password reset token
      var timespan = ms(cfg.tokenExpiration);
      user.pwdResetTokenExpires = moment().add(timespan, 'ms').toDate();

      // update user in db
      adapter.update(user, function(err, res) {
        if (err) console.log(err);

        // send email with forgot password link
        var mail = new Mail('emailForgotPassword');
        mail.send(user.name, user.email, token, function(err, res) {
          if (err) console.log(err);

          // send only JSON when REST is active
          if (config.rest) return response.send(204);

          response.render(view, {
            title: 'Forgot password'
          });
        });

      });

    });
  }

  // GET /forgot-password/:token
  function getToken(req, res, next) {
    // get token from url
    var token = req.params.token;

    // verify format of token
    var re = new RegExp('[0-9a-f]{22}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'i');

    // if format is wrong no need to query the database
    if (!re.test(token)) return next();

    // check if we have a user with that token
    adapter.find('pwdResetToken', token, function(err, user) {
      if (err) console.log(err);

      // if no user is found forward to error handling middleware
      if (!user) return next();

      // check if token has expired
      if (new Date(user.pwdResetTokenExpires) < new Date()) {
        // make old token invalid
        delete user.pwdResetToken;
        delete user.pwdResetTokenExpires;

        // update user in db
        adapter.update(user, function(err, user) {
          if (err) console.log(err);

          // send only JSON when REST is active
          if (config.rest) return res.json(403, {error: 'link expired'});

          // custom or built-in view
          var view = cfg.views.linkExpired || join('link-expired');

          // tell user that link has expired
          res.render(view, {
            title: 'Forgot password - Link expired'
          });

        });

        return;
      }

      // send only JSON when REST is active
      if (config.rest) return res.send(204);

      // custom or built-in view
      var view = cfg.views.newPassword || join('get-new-password');

      // render success message
      res.render(view, {
        token: token,
        title: 'Choose a new password'
      });

    });
  }

  // POST /forgot-password/:token
  function postToken(req, res, next) {
    var password = req.body.password;
    var token = req.params.token;

    var error = '';

    // verify format of token
    var re = new RegExp('[0-9a-f]{22}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'i');

    // if format is wrong no need to query the database
    if (!re.test(token)) return next();

    // check for valid input
    if (!password) {
      error = 'Please enter a password';

      // send only JSON when REST is active
      if (config.rest) return res.json(403, {error: error});

      // custom or built-in view
      var view = cfg.views.forgotPassword || join('get-forgot-password');

      res.status(403);
      res.render(view, {
        title: 'Choose a new password',
        error: error,
        token: token
      });
      return;
    }

    // check for token in db
    adapter.find('pwdResetToken', token, function(err, user) {
      if (err) console.log(err);

      // if no token is found forward to error handling middleware
      if (!user) return next();

      // check if token has expired
      if (new Date(user.pwdResetTokenExpires) < new Date()) {
        // make old token invalid
        delete user.pwdResetToken;
        delete user.pwdResetTokenExpires;

        // update user in db
        adapter.update(user, function(err, user) {
          if (err) console.log(err);

          // send only JSON when REST is active
          if (config.rest) return res.json(403, {error: 'link expired'});

          // custom or built-in view
          var view = cfg.views.linkExpired || join('link-expired');

          // tell user that link has expired
          res.render(view, {
            title: 'Forgot password - Link expired'
          });

        });

        return;
      }

      // if user comes from couchdb it has an 'iterations' key
      if (user.iterations) pwd.iterations(user.iterations);

      // create hash for new password
      // bcrypt.hash(password, 10, function(err, hash) {
      pwd.hash(password, function(err, salt, hash) {
        if (err) console.log(err);

        // update user's credentials
        user.salt = salt;
        user.derived_key = hash;

        // remove helper properties
        delete user.pwdResetToken;
        delete user.pwdResetTokenExpires;

        // update user in db
        adapter.update(user, function(err, user) {
          if (err) console.log(err);

          // send only JSON when REST is active
          if (config.rest) return res.send(204);

          // custom or built-in view
          var view = cfg.views.changedPassword || join('change-password-success');

          // render success message
          res.render(view, {
            title: 'Password changed'
          });

        });

      });


    });
  }

};
