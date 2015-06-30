'use strict';

var request = require('supertest');
var should = require('should'); // eslint-disable-line no-unused-vars
var uuid = require('node-uuid');
var utls = require('lockit-utils');

var config = require('./app/config.js');
var app = require('./app/app.js');

var db = utls.getDatabase(config);
var adapter = require(db.adapter)(config);

var _app = app(config);

// app with short token expiration time
var configTokenExpiration = JSON.parse(JSON.stringify(config));
// set some custom properties - for testing link expiration
configTokenExpiration.port = 4000;
configTokenExpiration.forgotPassword.tokenExpiration = '10 ms';
var appTokenExpiration = app(configTokenExpiration);

describe('# default config', function() {

  before(function(done) {
    adapter.save('john', 'john@email.com', 'password', function() {
      adapter.save('steve', 'steve@email.com', 'password', done);
    });
  });

  describe('GET /forgot-password', function() {

    it('should use the default route when none is specified', function(done) {
      request(_app)
        .get('/forgot-password')
        .end(function(err, res) {
          if (err) {console.log(err); }
          res.statusCode.should.equal(200);
          res.text.should.containEql('<div class="panel-heading">Forgot password</div>');
          res.text.should.containEql('<title>Forgot password</title>');
          done();
        });
    });

  });

  describe('POST /forgot-password', function() {

    it('should return an error when email has invalid format', function(done) {
      request(_app)
        .post('/forgot-password')
        .send({email: 'johnwayne.com'})
        .end(function(error, res) {
          res.statusCode.should.equal(403);
          res.text.should.containEql('Email is invalid');
          done();
        });
    });

    it('should render a success message when no user was found', function(done) {
      request(_app)
        .post('/forgot-password')
        .send({email: 'jim@wayne.com'})
        .end(function(error, res) {
          res.statusCode.should.equal(200);
          res.text.should.containEql('Email with link for password reset sent.');
          res.text.should.containEql('<title>Forgot password</title>');
          done();
        });
    });

    it('should render a success message when email was sent', function(done) {
      request(_app)
        .post('/forgot-password')
        .send({email: 'john@email.com'})
        .end(function(error, res) {
          res.statusCode.should.equal(200);
          res.text.should.containEql('Email with link for password reset sent.');
          res.text.should.containEql('<title>Forgot password</title>');
          done();
        });
    });

  });

  describe('GET /forgot-password/:token', function() {

    it('should forward to error handling middleware when token has invalid format', function(done) {
      request(_app)
        .get('/forgot-password/some-test-token-123')
        .end(function(err, res) {
          if (err) {console.log(err); }
          res.statusCode.should.equal(404);
          res.text.should.containEql('Cannot GET /forgot-password/some-test-token-123');
          done();
        });
    });

    it('should forward to error handling middleware when no user for token is found', function(done) {
      var token = uuid.v4();
      request(_app)
        .get('/forgot-password/' + token)
        .end(function(err, res) {
          if (err) {console.log(err); }
          res.statusCode.should.equal(404);
          res.text.should.containEql('Cannot GET /forgot-password/' + token);
          done();
        });
    });

    it('should render the link expired template when token has expired', function(done) {
      // create token
      request(appTokenExpiration)
        .post('/forgot-password')
        .send({email: 'steve@email.com'})
        .end(function() {
          // get token from db
          adapter.find('name', 'steve', function(err, user) {
            if (err) {console.log(err); }
            // use GET request
            request(_app)
              .get('/forgot-password/' + user.pwdResetToken)
              .end(function(error, res) {
                if (error) {console.log(error); }
                res.statusCode.should.equal(200);
                res.text.should.containEql('This link has expired');
                res.text.should.containEql('<title>Forgot password - Link expired</title>');
                done();
              });
          });
        });
    });

    it('should render a form to enter the new password', function(done) {
      // create token
      request(_app)
        .post('/forgot-password')
        .send({email: 'steve@email.com'})
        .end(function() {
          // get token from db
          adapter.find('name', 'steve', function(err, user) {
            if (err) {console.log(err); }
            // use GET request
            request(_app)
              .get('/forgot-password/' + user.pwdResetToken)
              .end(function(error, res) {
                if (error) {console.log(error); }
                res.text.should.containEql('Create a new password');
                done();
              });
          });
        });
    });

  });

  describe('POST /forgot-password/:token', function() {

    it('should return with an error message when password is empty', function(done) {
      var token = uuid.v4();
      request(_app)
        .post('/forgot-password/' + token)
        .send({password: ''})
        .end(function(err, res) {
          if (err) {console.log(err); }
          res.statusCode.should.equal(403);
          res.text.should.containEql('Please enter a password');
          res.text.should.containEql('<title>Choose a new password</title>');
          done();
        });
    });

    it('should forward to error handling middleware when token has invalid format', function(done) {
      request(_app)
        .post('/forgot-password/some-test-token-123')
        .send({password: 'new Password'})
        .end(function(err, res) {
          if (err) {console.log(err); }
          res.statusCode.should.equal(404);
          res.text.should.containEql('Cannot POST /forgot-password/some-test-token-123');
          done();
        });
    });

    it('should forward to error handling middleware when no user for token is found', function(done) {
      var token = uuid.v4();
      request(_app)
          .post('/forgot-password/' + token)
          .send({password: 'new Password'})
          .end(function(err, res) {
            if (err) {console.log(err); }
            res.statusCode.should.equal(404);
            res.text.should.containEql('Cannot POST /forgot-password/' + token);
            done();
          });
    });

    it('should render the link expired template when token has expired', function(done) {
      // create token
      request(appTokenExpiration)
        .post('/forgot-password')
        .send({email: 'steve@email.com'})
        .end(function() {
          // get token from db
          adapter.find('name', 'steve', function(err, user) {
            if (err) {console.log(err); }
            // use token from db for POST request
            request(_app)
              .post('/forgot-password/' + user.pwdResetToken)
              .send({password: 'something'})
              .end(function(error, res) {
                if (error) {console.log(error); }
                res.statusCode.should.equal(200);
                res.text.should.containEql('This link has expired');
                res.text.should.containEql('<title>Forgot password - Link expired</title>');
                done();
              });
          });
        });
    });

    it('should render a success message when everything is fine', function(done) {
      // get token from db
      adapter.find('name', 'john', function(err, user) {
        if (err) {console.log(err); }
        // use token to make proper request
        request(_app)
          .post('/forgot-password/' + user.pwdResetToken)
          .send({password: 'new Password'})
          .end(function(error, res) {
            if (error) {console.log(error); }
            res.statusCode.should.equal(200);
            res.text.should.containEql('You have successfully changed your password');
            res.text.should.containEql('<title>Password changed</title>');
            done();
          });
      });
    });



  });

  after(function(done) {
    adapter.remove('john', function() {
      adapter.remove('steve', done);
    });
  });

});
