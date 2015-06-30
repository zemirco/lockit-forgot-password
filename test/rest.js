'use strict';

var request = require('supertest');
var should = require('should'); // eslint-disable-line no-unused-vars
var uuid = require('node-uuid');
var utls = require('lockit-utils');

var config = require('./app/config.js');
var app = require('./app/app.js');

var db = utls.getDatabase(config);
var adapter = require(db.adapter)(config);

// testing the rest api
var confiRest = JSON.parse(JSON.stringify(config));
confiRest.port = 6000;
confiRest.rest = true;
var appRest = app(confiRest);

var configTokenExpiration = JSON.parse(JSON.stringify(config));
configTokenExpiration.port = 6001;
configTokenExpiration.forgotPassword.tokenExpiration = '1 ms';
var appTokenExpiration = app(configTokenExpiration);

describe('# rest enabled', function() {

  // add a dummy user to db
  before(function(done) {
    adapter.save('rest', 'rest@email.com', 'password', function() {
      adapter.save('alan', 'alan@email.com', 'password', done);
    });
  });

  describe('GET /forgot-password', function() {

    it('should be forwarded to error handling middleware when rest is active', function(done) {
      request(appRest)
        .get('/rest/forgot-password')
        .end(function(err, res) {
          if (err) {console.log(err); }
          res.statusCode.should.equal(404);
          done();
        });
    });

  });

  describe('POST /forgot-password', function() {

    it('should return an error when email has invalid format', function(done) {
      request(appRest)
        .post('/rest/forgot-password')
        .send({email: 'someemail.com'})
        .end(function(error, res) {
          res.statusCode.should.equal(403);
          res.text.should.equal('{"error":"Email is invalid"}');
          done();
        });
    });

    it('should render a success message when no user was found', function(done) {
      request(appRest)
        .post('/rest/forgot-password')
        .send({email: 'jim@wayne.com'})
        .end(function(error, res) {
          res.statusCode.should.equal(204);
          done();
        });
    });

    it('should render a success message when email was sent', function(done) {
      request(appRest)
        .post('/rest/forgot-password')
        .send({email: 'rest@email.com'})
        .end(function(error, res) {
          res.statusCode.should.equal(204);
          done();
        });
    });

  });

  describe('GET /forgot-password/:token', function() {

    it('should forward to error handling middleware when token has invalid format', function(done) {
      request(appRest)
        .get('/rest/forgot-password/some-test-token-123')
        .end(function(err, res) {
          if (err) {console.log(err); }
          res.statusCode.should.equal(404);
          done();
        });
    });

    it('should forward to error handling middleware when no user for token is found', function(done) {
      var token = uuid.v4();
      request(appRest)
        .get('/rest/forgot-password/' + token)
        .end(function(err, res) {
          if (err) {console.log(err); }
          res.statusCode.should.equal(404);
          done();
        });
    });

    it('should render the link expired template when token has expired', function(done) {
      // create token
      request(appTokenExpiration)
        .post('/forgot-password')
        .send({email: 'alan@email.com'})
        .end(function() {
          // get token from db
          adapter.find('name', 'alan', function(error, user) {
            if (error) {console.log(error); }
            // use GET request
            request(appRest)
              .get('/rest/forgot-password/' + user.pwdResetToken)
              .end(function(err, res) {
                if (err) {console.log(err); }
                res.statusCode.should.equal(403);
                res.text.should.equal('{"error":"link expired"}');
                done();
              });
          });
        });
    });

    it('should render a form to enter the new password', function(done) {
      // create token
      request(appRest)
        .post('/forgot-password')
        .send({email: 'rest@email.com'})
        .end(function() {
          // get token from db
          adapter.find('name', 'rest', function(err, user) {
            if (err) {console.log(err); }
            // use GET request
            request(appRest)
              .get('/rest/forgot-password/' + user.pwdResetToken)
              .end(function(error, res) {
                if (error) {console.log(error); }
                res.statusCode.should.equal(204);
                done();
              });
          });
        });
    });

  });

  describe('POST /forgot-password/:token', function() {

    it('should return with an error message when password is empty', function(done) {
      var token = uuid.v4();
      request(appRest)
        .post('/rest/forgot-password/' + token)
        .send({password: ''})
        .end(function(err, res) {
          if (err) {console.log(err); }
          res.statusCode.should.equal(403);
          res.text.should.equal('{"error":"Please enter a password"}');
          done();
        });
    });

    it('should render the link expired template when token has expired', function(done) {
      // create token
      request(appTokenExpiration)
        .post('/forgot-password')
        .send({email: 'alan@email.com'})
        .end(function() {
          // get token from db
          adapter.find('name', 'alan', function(err, user) {
            if (err) {console.log(err); }
            // use token from db for POST request
            request(appRest)
              .post('/rest/forgot-password/' + user.pwdResetToken)
              .send({password: 'something'})
              .end(function(error, res) {
                if (error) {console.log(error); }
                res.statusCode.should.equal(403);
                res.text.should.equal('{"error":"link expired"}');
                done();
              });
          });
        });
    });

    it('should render a success message when everything is fine', function(done) {
      // create token
      request(appRest)
        .post('/forgot-password')
        .send({email: 'rest@email.com'})
        .end(function() {
          // get token from db
          adapter.find('name', 'rest', function(err, user) {
            if (err) {console.log(err); }
            // use token from db for POST request
            request(appRest)
              .post('/rest/forgot-password/' + user.pwdResetToken)
              .send({password: 'something'})
              .end(function(error, res) {
                if (error) {console.log(error); }
                res.statusCode.should.equal(204);
                done();
              });
          });
        });
    });

  });

  after(function(done) {
    adapter.remove('rest', function() {
      adapter.remove('alan', done);
    });
  });

});
