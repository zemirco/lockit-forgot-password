
var request = require('supertest');
var should = require('should');
var uuid = require('node-uuid');
var utls = require('lockit-utils');

// normal app with default config and default views
var config = require('./config.js');
var app = require('./app.js')(config);

// clone config object
var config_2 = JSON.parse(JSON.stringify(config));
// set some custom properties - for testing link expiration
config_2.port = 4000;
config_2.forgotPassword.tokenExpiration = 10;
var app_2 = require('./app.js')(config_2);

// testing custom views
var config_3 = JSON.parse(JSON.stringify(config));
config_3.port = 5000;
config_3.forgotPassword.views = {
  forgotPassword: 'custom/forgotPassword',
  newPassword: 'custom/newPassword',
  changedPassword: 'custom/changedPassword',
  linkExpired: 'custom/linkExpired',
  sentEmail: 'custom/sentEmail'
};
var app_3 = require('./app.js')(config_3);

// testing the rest api
var config_4 = JSON.parse(JSON.stringify(config));
config_4.port = 6000;
config_4.rest = true;
var app_4 = require('./app.js')(config_4);

var db = utls.getDatabase(config);
var adapter = require(db.adapter)(config);

// add a dummy user to db
before(function(done) {
  adapter.save('john', 'john@email.com', 'password', function(err, user) {
    if (err) console.log(err);
    adapter.save('steve', 'steve@email.com', 'password', function(err, user) {
      if (err) console.log(err);
      adapter.save('rest', 'rest@email.com', 'password', function(err, user) {
        if (err) console.log(err);
        done();
      });
    });

  });
});

// start the test
describe('forgot-password', function() {

  describe('GET /forgot-password', function() {

    it('should use the default route when none is specified', function(done) {
      request(app)
        .get('/forgot-password')
        .end(function(err, res) {
          res.statusCode.should.equal(200);
          res.text.should.include('Enter your email address here and we\'ll send you an email with a link');
          res.text.should.include('<title>Forgot password</title>');
          done();
        });
    });

    it('should work with custom views', function(done) {
      request(app_3)
        .get('/forgot-password')
        .end(function(err, res) {
          res.text.should.include('Too bad you forgot your password!');
          done();
        });
    });

    it('should be forwarded to error handling middleware when rest is active', function(done) {
      request(app_4)
        .get('/rest/forgot-password')
        .end(function(err, res) {
//          res.statusCode.should.equal(404);
          done();
        });
    });

  });
  
  describe('POST /forgot-password', function() {

    it('should return an error when email has invalid format', function(done) {
      request(app)
        .post('/forgot-password')
        .send({email: 'johnwayne.com'})
        .end(function(error, res) {
          res.statusCode.should.equal(403);
          res.text.should.include('Email is invalid');
          done();
        });
    });

    it('should return an error when email has invalid format (REST)', function(done) {
      request(app_4)
        .post('/rest/forgot-password')
        .send({email: 'johnwayne.com'})
        .end(function(error, res) {
          res.statusCode.should.equal(403);
          res.text.should.equal('{"error":"Email is invalid"}');
          done();
        });
    });

    // test the error view
    it('should work with custom view when something is wrong', function(done) {
      request(app_3)
        .post('/forgot-password')
        .send({email: 'johnwayne.com'})
        .end(function(error, res) {
          res.text.should.include('Too bad you forgot your password!');
          done();
        });
    });

    it('should render a success message when no user was found', function(done) {
      request(app)
        .post('/forgot-password')
        .send({email: 'jim@wayne.com'})
        .end(function(error, res) {
          res.statusCode.should.equal(200);
          res.text.should.include('Email with link for password reset sent.');
          res.text.should.include('<title>Forgot password</title>');
          done();
        });
    });

    it('should render a success message when no user was found (REST)', function(done) {
      request(app_4)
        .post('/rest/forgot-password')
        .send({email: 'jim@wayne.com'})
        .end(function(error, res) {
          res.statusCode.should.equal(200);
          res.text.should.equal('OK');
          done();
        });
    });

    it('should render a success message when email was sent', function(done) {
      request(app)
        .post('/forgot-password')
        .send({email: 'john@email.com'})
        .end(function(error, res) {
          res.statusCode.should.equal(200);
          res.text.should.include('Email with link for password reset sent.');
          res.text.should.include('<title>Forgot password</title>');
          done();
        });
    });

    it('should render a success message when email was sent (REST)', function(done) {
      request(app_4)
        .post('/rest/forgot-password')
        .send({email: 'rest@email.com'})
        .end(function(error, res) {
          res.statusCode.should.equal(200);
          res.text.should.equal('OK');
          done();
        });
    });

    // test the success view
    it('should work with custom views', function(done) {
      request(app_3)
        .post('/forgot-password')
        .send({email: 'jim@wayne.com'})
        .end(function(error, res) {
          res.text.should.include('You\'ve got mail');
          done();
        });
    });
    
  });
  
  describe('GET /forgot-password/:token', function() {
    
    it('should forward to error handling middleware when token has invalid format', function(done) {
      request(app)
        .get('/forgot-password/some-test-token-123')
        .end(function(err, res) {
          res.statusCode.should.equal(404);
          res.text.should.include('Cannot GET /forgot-password/some-test-token-123');
          done();
        });
    });

    it('should forward to error handling middleware when token has invalid format (REST)', function(done) {
      request(app_4)
        .get('/rest/forgot-password/some-test-token-123')
        .end(function(err, res) {
          res.statusCode.should.equal(404);
          done();
        });
    });

    it('should forward to error handling middleware when no user for token is found', function(done) {
      var token = uuid.v4();
      request(app)
        .get('/forgot-password/' + token)
        .end(function(err, res) {
          res.statusCode.should.equal(404);
          res.text.should.include('Cannot GET /forgot-password/' + token);
          done();
        });
    });

    it('should forward to error handling middleware when no user for token is found (REST)', function(done) {
      var token = uuid.v4();
      request(app)
        .get('/rest/forgot-password/' + token)
        .end(function(err, res) {
          res.statusCode.should.equal(404);
          done();
        });
    });

    it('should render the link expired template when token has expired', function(done) {

      // create token
      request(app_2)
        .post('/forgot-password')
        .send({email: 'steve@email.com'})
        .end(function(error, res) {

          // get token from db
          adapter.find('username', 'steve', function(err, user) {
            if (err) console.log(err);

            // use GET request
            request(app)
              .get('/forgot-password/' + user.pwdResetToken)
              .end(function(err, res) {
                res.statusCode.should.equal(200);
                res.text.should.include('This link has expired');
                res.text.should.include('<title>Forgot password - Link expired</title>');
                done();
              });
          });

        });

    });

    it('should render the link expired template when token has expired (REST)', function(done) {

      // create token
      request(app_2)
          .post('/forgot-password')
          .send({email: 'steve@email.com'})
          .end(function(error, res) {

            // get token from db
            adapter.find('username', 'steve', function(err, user) {
              if (err) console.log(err);

              // use GET request
              request(app_4)
                  .get('/rest/forgot-password/' + user.pwdResetToken)
                  .end(function(err, res) {
                    res.statusCode.should.equal(403);
                    res.text.should.equal('{"error":"link expired"}');
                    done();
                  });
            });

          });

    });
    
    it('should render a form to enter the new password', function(done) {

      // create token
      request(app)
        .post('/forgot-password')
        .send({email: 'steve@email.com'})
        .end(function(error, res) {

          // get token from db
          adapter.find('username', 'steve', function(err, user) {
            if (err) console.log(err);

            // use GET request
            request(app)
              .get('/forgot-password/' + user.pwdResetToken)
              .end(function(err, res) {
                res.text.should.include('Create a new password');
                done();
              });
          });

        });

    });

    it('should render a form to enter the new password (REST)', function(done) {

      // create token
      request(app)
          .post('/forgot-password')
          .send({email: 'steve@email.com'})
          .end(function(error, res) {

            // get token from db
            adapter.find('username', 'steve', function(err, user) {
              if (err) console.log(err);

              // use GET request
              request(app_4)
                  .get('/rest/forgot-password/' + user.pwdResetToken)
                  .end(function(err, res) {
                    res.statusCode.should.equal(200);
                    res.text.should.equal('OK');
                    done();
                  });
            });

          });

    });

    it('should work with custom views', function(done) {

      request(app_3)
        .post('/forgot-password')
        .send({email: 'steve@email.com'})
        .end(function(error, res) {

          // get token from db
          adapter.find('username', 'steve', function(err, user) {
            if (err) console.log(err);

            // use GET request
            request(app_3)
              .get('/forgot-password/' + user.pwdResetToken)
              .end(function(err, res) {
                res.text.should.include('Just choose a new one.');
                done();
              });
          });

        });

    });
    
  });
  
  describe('POST /forgot-password/:token', function() {

    it('should return with an error message when password is empty', function(done) {
      var token = uuid.v4();
      request(app)
        .post('/forgot-password/' + token)
        .send({password: ''})
        .end(function(err, res) {
          res.statusCode.should.equal(403);
          res.text.should.include('Please enter a password');
          res.text.should.include('<title>Choose a new password</title>');
          done();
        });
    });

    it('should return with an error message when password is empty (REST)', function(done) {
      var token = uuid.v4();
      request(app_4)
        .post('/rest/forgot-password/' + token)
        .send({password: ''})
        .end(function(err, res) {
          res.statusCode.should.equal(403);
          res.text.should.equal('{"error":"Please enter a password"}');
          done();
        });
    });
    
    // error view
    it('should work with custom views', function(done) {
      var token = uuid.v4();
      request(app_3)
        .post('/forgot-password/' + token)
        .send({password: ''})
        .end(function(err, res) {
          res.text.should.include('Too bad you forgot your password!');
          done();
        });
    });
    
    it('should forward to error handling middleware when token has invalid format', function(done) {
      request(app)
        .post('/forgot-password/some-test-token-123')
        .send({password: 'new Password'})
        .end(function(err, res) {
          res.statusCode.should.equal(404);
          res.text.should.include('Cannot POST /forgot-password/some-test-token-123');
          done();
        });
    });

    it('should forward to error handling middleware when no user for token is found', function(done) {
      var token = uuid.v4();
      request(app)
        .post('/forgot-password/' + token)
        .send({password: 'new Password'})
        .end(function(err, res) {
          res.statusCode.should.equal(404);
          res.text.should.include('Cannot POST /forgot-password/' + token);
          done();
        });
    });

    it('should render the link expired template when token has expired', function(done) {

      // create token
      request(app_2)
        .post('/forgot-password')
        .send({email: 'steve@email.com'})
        .end(function(error, res) {

          // get token from db
          adapter.find('username', 'steve', function(err, user) {
            if (err) console.log(err);

            // use token from db for POST request
            request(app)
              .post('/forgot-password/' + user.pwdResetToken)
              .send({password: 'something'})
              .end(function(err, res) {
                res.statusCode.should.equal(200);
                res.text.should.include('This link has expired');
                res.text.should.include('<title>Forgot password - Link expired</title>');
                done();
              });
          });

        });

    });

    it('should render the link expired template when token has expired (REST)', function(done) {

      // create token
      request(app_2)
        .post('/forgot-password')
        .send({email: 'steve@email.com'})
        .end(function(error, res) {

          // get token from db
          adapter.find('username', 'steve', function(err, user) {
            if (err) console.log(err);

            // use token from db for POST request
            request(app_4)
              .post('/rest/forgot-password/' + user.pwdResetToken)
              .send({password: 'something'})
              .end(function(err, res) {
                res.statusCode.should.equal(403);
                res.text.should.equal('{"error":"link expired"}');
                done();
              });
          });

        });

    });

    // custom link expired template
    it('should render custom link expired template', function(done) {

      // create token
      request(app_2)
        .post('/forgot-password')
        .send({email: 'steve@email.com'})
        .end(function(error, res) {

          // get token from db
          adapter.find('username', 'steve', function(err, user) {
            if (err) console.log(err);

            // use token from db for POST request
            request(app_3)
              .post('/forgot-password/' + user.pwdResetToken)
              .send({password: 'something'})
              .end(function(err, res) {
                res.text.should.include('No no no! Not valid anymore.');
                done();
              });
          });

        });

    });

    it('should render a success message when everything is fine', function(done) {

      // get token from db
      adapter.find('username', 'john', function(err, user) {
        if (err) console.log(err);

        // use token to make proper request
        request(app)
          .post('/forgot-password/' + user.pwdResetToken)
          .send({password: 'new Password'})
          .end(function(err, res) {
            res.statusCode.should.equal(200);
            res.text.should.include('You have successfully changed your password');
            res.text.should.include('<title>Password changed</title>');
            done();
          });
      });
    });

    it('should render a success message when everything is fine (REST)', function(done) {

      // create token
      request(app)
        .post('/forgot-password')
        .send({email: 'rest@email.com'})
        .end(function(error, res) {

          // get token from db
          adapter.find('username', 'rest', function(err, user) {
            if (err) console.log(err);

            // use token from db for POST request
            request(app_4)
              .post('/rest/forgot-password/' + user.pwdResetToken)
              .send({password: 'something'})
              .end(function(err, res) {
                res.statusCode.should.equal(200);
                res.text.should.equal('OK');
                done();
              });
          });

        });
    });

    it('should render custom success view', function(done) {

      // create token
      request(app_3)
        .post('/forgot-password')
        .send({email: 'steve@email.com'})
        .end(function(error, res) {

          // get token from db
          adapter.find('username', 'steve', function(err, user) {
            if (err) console.log(err);

            // use token from db for POST request
            request(app_3)
              .post('/forgot-password/' + user.pwdResetToken)
              .send({password: 'something'})
              .end(function(err, res) {
                res.text.should.include('Well done, bro!');
                done();
              });
          });

        });
    });
    
  });

});

// remove user from db
after(function(done) {

  adapter.remove('username', 'john', function(err) {
    if (err) console.log(err);
    adapter.remove('username', 'steve', function(err) {
      if (err) console.log(err);
      adapter.remove('username', 'rest', function(err) {
        if (err) console.log(err);
        done();
      });
    });
  });

});