
var request = require('supertest');
var should = require('should');
var uuid = require('node-uuid');
var utls = require('lockit-utils');

var config = require('./app/config.js');
var app = require('./app/app.js');

var db = utls.getDatabase(config);
var adapter = require(db.adapter)(config);

// testing custom views
var _config = JSON.parse(JSON.stringify(config));
_config.port = 5000;
_config.forgotPassword.views = {
  forgotPassword: 'custom/forgotPassword',
  newPassword: 'custom/newPassword',
  changedPassword: 'custom/changedPassword',
  linkExpired: 'custom/linkExpired',
  sentEmail: 'custom/sentEmail'
};
var _app = app(_config);

var _config_two = JSON.parse(JSON.stringify(config));
_config_two.port = 5001;
_config_two.forgotPassword.tokenExpiration = '1 ms';
var _app_two = app(_config_two);

describe('# custom views', function() {

  before(function(done) {
    adapter.save('custom', 'custom@email.com', 'password', function() {
      done();
    });
  });

  describe('GET /forgot-password', function() {

    it('should work with custom views', function(done) {
      request(_app)
        .get('/forgot-password')
        .end(function(err, res) {
          res.text.should.include('Too bad you forgot your password!');
          done();
        });
    });

  });

  describe('POST /forgot-password', function() {

    // test the error view
    it('should work with custom view when something is wrong', function(done) {
      request(_app)
        .post('/forgot-password')
        .send({email: 'someemail.com'})
        .end(function(error, res) {
          res.text.should.include('Too bad you forgot your password!');
          done();
        });
    });

    // test the success view
    it('should work with custom views', function(done) {
      request(_app)
        .post('/forgot-password')
        .send({email: 'jim@wayne.com'})
        .end(function(error, res) {
          res.text.should.include('You\'ve got mail');
          done();
        });
    });

  });

  describe('GET /forgot-password/:token', function() {

    it('should work with custom views', function(done) {
      request(_app)
        .post('/forgot-password')
        .send({email: 'custom@email.com'})
        .end(function(error, res) {
          // get token from db
          adapter.find('name', 'custom', function(err, user) {
            // use GET request
            request(_app)
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

    // error view
    it('should work with custom views', function(done) {
      var token = uuid.v4();
      request(_app)
        .post('/forgot-password/' + token)
        .send({password: ''})
        .end(function(err, res) {
          res.text.should.include('Too bad you forgot your password!');
          done();
        });
    });

    // custom link expired template
    it('should render custom link expired template', function(done) {
      // create token
      request(_app_two)
        .post('/forgot-password')
        .send({email: 'custom@email.com'})
        .end(function(error, res) {
          // get token from db
          adapter.find('name', 'custom', function(err, user) {
            // use token from db for POST request
            request(_app)
              .post('/forgot-password/' + user.pwdResetToken)
              .send({password: 'something'})
              .end(function(err, res) {
                res.text.should.include('No no no! Not valid anymore.');
                done();
              });
          });
        });
    });

    it('should render custom success view', function(done) {
      // create token
      request(_app)
        .post('/forgot-password')
        .send({email: 'custom@email.com'})
        .end(function(error, res) {
          // get token from db
          adapter.find('name', 'custom', function(err, user) {
            // use token from db for POST request
            request(_app)
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

  after(function(done) {
    adapter.remove('custom', done);
  });

});
