
var path = require('path');
var uuid = require('node-uuid');
var bcrypt = require('bcrypt');
var ms = require('ms');
var moment = require('moment');

var debug = require('debug')('lockit-forgot-password');

module.exports = function(app, config) {
  
  var adapter = require('lockit-' + config.db + '-adapter')(config);
  var Mail = require('lockit-sendmail')(config);

  // set default route
  var route = config.forgotPasswordRoute || '/forgot-password';

  // GET /forgot-password
  app.get(route, function(req, res) {
    debug('rendering GET %s', route);
    res.render(path.join(__dirname, 'views', 'get-forgot-password'), {
      title: 'Forgot password'
    });
  });
  
  // POST /forgot-password
  app.post(route, function(req, response) {
    debug('receiving data via POST request to %s: %j', route, req.body);
    var email = req.body.email;

    var error = null;
    // regexp from https://github.com/angular/angular.js/blob/master/src/ng/directive/input.js#L4
    var EMAIL_REGEXP = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,6}$/;

    // check for valid input
    if (!email || !email.match(EMAIL_REGEXP)) {
      debug('Invalid input value: Email is invalid');
      response.status(403);
      response.render(path.join(__dirname, 'views', 'get-forgot-password'), {
        title: 'Forgot password',
        error: 'Email is invalid'
      });
      return;
    }
    
    // looks like given email address has the correct format
    
    // look for user in db
    adapter.find('email', email, function(err, user) {
      if (err) console.log(err);
      
      // no user found -> pretend we sent an email
      if (!user) {
        debug('No user found. Pretend to send an email');
        response.render(path.join(__dirname, 'views', 'post-forgot-password'), {
          title: 'Forgot password'
        });
        return;
      }
      
      // user found in db
      // delete old password and send link with setting new password page
      var token = uuid.v4();
      delete user.hash;
      user.pwdResetToken = token;
      
      // set expiration date for password reset token
      var timespan = ms(config.forgotPasswordTokenExpiration);      
      user.pwdResetTokenExpires = moment().add(timespan, 'ms').toDate();
      
      // update user in db
      adapter.update(user, function(err, res) {
        if (err) console.log(err);

        // send email with forgot password link
        var mail = new Mail('emailForgotPassword');
        mail.send(user.username, user.email, token, function(err, res) {
          if (err) console.log(err);
          response.render(path.join(__dirname, 'views', 'post-forgot-password'), {
            title: 'Forgot password'
          });
        });
        
      });
      
    });
    
  });
  
  // GET /forgot-password/:token
  app.get(route + '/:token', function(req, res, next) {
    debug('rendering GET %s/:token', route);
    // get token from url
    var token = req.params.token;
    
    // verify format of token
    var re = new RegExp('[0-9a-f]{22}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'i');

    // if format is wrong no need to query the database
    if (!re.test(token)) {
      debug('Token has invalid format');
      return next();
    }
    
    // check if we have a user with that token
    adapter.find('pwdResetToken', token, function(err, user) {
      if (err) console.log(err);

      // if no user is found forward to error handling middleware
      if (!user) return next();
      
      // check if token has expired
      if (new Date(user.pwdResetTokenExpires) < new Date()) {
        debug('Token has expired');
        // make old token invalid
        delete user.pwdResetToken;
        delete user.pwdResetTokenExpires;

        // update user in db
        adapter.update(user, function(err, user) {
          if (err) console.log(err);

          // tell user that link has expired
          res.render(path.join(__dirname, 'views', 'link-expired'), {
            title: 'Forgot password - Link expired'
          });

        });

        return;
      }
      
      // render success message
      res.render(path.join(__dirname, 'views', 'get-new-password'), {
        token: token,
        title: 'Choose a new password'
      });
      
    });
    
  });
  
  // POST /forgot-password/:token
  app.post(route + '/:token', function(req, res, next) {
    debug('receiving data via POST request to %s/:token: %j', route, req.body);
    var password = req.body.password;
    var token = req.params.token;

    // verify format of token
    var re = new RegExp('[0-9a-f]{22}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'i');

    // if format is wrong no need to query the database
    if (!re.test(token)) {
      debug('Token has invalid format');
      return next();
    }

    // check for valid input
    if (!password) {
      debug('Password missing');
      res.status(403);
      res.render(path.join(__dirname, 'views', 'get-forgot-password'), {
        title: 'Choose a new password',
        error: 'Please enter a password',
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
        debug('Token has expired');
        // make old token invalid
        delete user.pwdResetToken;
        delete user.pwdResetTokenExpires;

        // update user in db
        adapter.update(user, function(err, user) {
          if (err) console.log(err);

          // tell user that link has expired
          res.render(path.join(__dirname, 'views', 'link-expired'), {
            title: 'Forgot password - Link expired'
          });

        });

        return;
      }
      
      // create hash for new password
      bcrypt.hash(password, 10, function(err, hash) {
        if (err) console.log(err);
        
        // update user's credentials
        user.hash = hash;
        
        // remove helper properties
        delete user.pwdResetToken;
        delete user.pwdResetTokenExpires;
        
        // update user in db
        adapter.update(user, function(err, user) {
          if (err) console.log(err);
          
          // render success message
          res.render(path.join(__dirname, 'views', 'change-password-success'), {
            title: 'Password changed'
          });
          
        });

      });
      

    });
    
  });
  
};