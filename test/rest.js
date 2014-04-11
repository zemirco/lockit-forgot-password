

var request = require('supertest');
var should = require('should');
var uuid = require('node-uuid');
var utls = require('lockit-utils');

var config = require('./app/config.js');
var app = require('./app/app.js');

var db = utls.getDatabase(config);
var adapter = require(db.adapter)(config);

// testing the rest api
var _config = JSON.parse(JSON.stringify(config));
_config.port = 6000;
_config.rest = true;
var _app = app(_config);

var _config_two = JSON.parse(JSON.stringify(config));
_config_two.port = 6001;
_config_two.forgotPassword.tokenExpiration = '1 ms';
var _app_two = app(_config_two);

describe('# rest enabled', function() {

  // add a dummy user to db
  before(function(done) {
    adapter.save('rest', 'rest@email.com', 'password', function() {
      adapter.save('alan', 'alan@email.com', 'password', done);
    });
  });

  describe('GET /forgot-password', function() {

    it('should be forwarded to error handling middleware when rest is active', function(done) {
      request(_app)
        .get('/rest/forgot-password')
        .end(function(err, res) {
          res.statusCode.should.equal(404);
          done();
        });
    });

  });

  describe('POST /forgot-password', function() {

    it('should return an error when email has invalid format', function(done) {
      request(_app)
        .post('/rest/forgot-password')
        .send({email: 'someemail.com'})
        .end(function(error, res) {
          res.statusCode.should.equal(403);
          res.text.should.equal('{"error":"Email is invalid"}');
          done();
        });
    });

    it('should render a success message when no user was found', function(done) {
      request(_app)
        .post('/rest/forgot-password')
        .send({email: 'jim@wayne.com'})
        .end(function(error, res) {
          res.statusCode.should.equal(204);
          done();
        });
    });

    it('should render a success message when email was sent', function(done) {
      request(_app)
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
      request(_app)
        .get('/rest/forgot-password/some-test-token-123')
        .end(function(err, res) {
          res.statusCode.should.equal(404);
          done();
        });
    });

    it('should forward to error handling middleware when no user for token is found', function(done) {
      var token = uuid.v4();
      request(_app)
        .get('/rest/forgot-password/' + token)
        .end(function(err, res) {
          res.statusCode.should.equal(404);
          done();
        });
    });

    it('should render the link expired template when token has expired', function(done) {
      // create token
      request(_app_two)
        .post('/forgot-password')
        .send({email: 'alan@email.com'})
        .end(function(error, res) {
          // get token from db
          adapter.find('name', 'alan', function(err, user) {
            // use GET request
            request(_app)
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
      request(_app)
        .post('/forgot-password')
        .send({email: 'rest@email.com'})
        .end(function(error, res) {
          // get token from db
          adapter.find('name', 'rest', function(err, user) {
            // use GET request
            request(_app)
              .get('/rest/forgot-password/' + user.pwdResetToken)
              .end(function(err, res) {
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
      request(_app)
        .post('/rest/forgot-password/' + token)
        .send({password: ''})
        .end(function(err, res) {
          res.statusCode.should.equal(403);
          res.text.should.equal('{"error":"Please enter a password"}');
          done();
        });
    });

    it('should render the link expired template when token has expired', function(done) {
      // create token
      request(_app_two)
        .post('/forgot-password')
        .send({email: 'alan@email.com'})
        .end(function(error, res) {
          // get token from db
          adapter.find('name', 'alan', function(err, user) {
            // use token from db for POST request
            request(_app)
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

    it('should render a success message when everything is fine', function(done) {
      // create token
      request(_app)
        .post('/forgot-password')
        .send({email: 'rest@email.com'})
        .end(function(error, res) {
          // get token from db
          adapter.find('name', 'rest', function(err, user) {
            // use token from db for POST request
            request(_app)
              .post('/rest/forgot-password/' + user.pwdResetToken)
              .send({password: 'something'})
              .end(function(err, res) {
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
