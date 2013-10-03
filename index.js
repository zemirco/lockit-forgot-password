
var path = require('path');
var uuid = require('node-uuid');
var bcrypt = require('bcrypt');

module.exports = function(app, config) {
  
  var adapter = require('lockit-' + config.db + '-adapter')(config);
  var sendmail = require('lockit-sendmail')(config);

  // set default route
  var route = config.forgotPasswordRoute || '/forgot-password';

  // GET /forgot-password
  app.get(route, function(req, res) {
    res.render(path.join(__dirname, 'views', 'get-forgot-password'), {
      title: 'Forgot password'
    });
  });
  
  // POST /forgot-password
  app.post(route, function(req, response) {
    
    var email = req.body.email;

    var error = null;
    // regexp from https://github.com/angular/angular.js/blob/master/src/ng/directive/input.js#L4
    var EMAIL_REGEXP = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,6}$/;

    // check for valid input
    if (!email || !email.match(EMAIL_REGEXP)) {
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
        response.render(path.join(__dirname, 'views', 'post-forgot-password'), {
          title: 'Forgot password'
        });
        return;
      }
      
      // user found in db
      // set old pw and hash to null
      // send link with setting new password page
      var token = uuid.v4();
      delete user.hash;
      user.pwdResetToken = token;
      
      // set expiration date for password reset token
      var now = new Date();
      var tomorrow = now.setTime(now.getTime() + config.forgotPasswordTokenExpiration);

      user.pwdResetTokenExpires = new Date(tomorrow);
      
      // update user in db
      adapter.update(user, function(err, res) {
        if (err) console.log(err);

        // send email with forgot password link
        sendmail.forgotPassword(user.username, user.email, token, function(err, res) {
          if (err) console.log(err);

          // render success message
          response.render(path.join(__dirname, 'views', 'post-forgot-password'), {
            title: 'Forgot password'
          });
          
        });
        
      });
      
    });
    
  });
  
  // GET /forgot-password/:token
  app.get(route + '/:token', function(req, res, next) {
    
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

          // tell user that link has expired
          res.render(path.join(__dirname, 'views', 'link-expired'), {
            title: 'Forgot password - Link expired'
          });

        });

        return;
      }
      
      // send token as local variable for POST request to right url 
      res.render(path.join(__dirname, 'views', 'get-new-password'), {
        token: token,
        title: 'Choose a new password'
      });
      
    });
    
  });
  
  // POST /forgot-password/:token
  app.post(route + '/:token', function(req, res, next) {
    
    var password = req.body.password;
    var token = req.params.token;

    // verify format of token
    var re = new RegExp('[0-9a-f]{22}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'i');

    // if format is wrong no need to query the database
    if (!re.test(token)) return next();

    // check for valid input
    if (!password) {
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