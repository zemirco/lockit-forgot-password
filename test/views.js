'use strict';

var request = require('supertest');
var should = require('should'); // eslint-disable-line no-unused-vars
var uuid = require('node-uuid');
var utls = require('lockit-utils');

var config = require('./app/config.js');
var app = require('./app/app.js');

var db = utls.getDatabase(config);
var adapter = require(db.adapter)(config);

// testing custom views
var configCustomViews = JSON.parse(JSON.stringify(config));
configCustomViews.port = 5000;
configCustomViews.forgotPassword.views = {
  forgotPassword: 'custom/forgotPassword',
  newPassword: 'custom/newPassword',
  changedPassword: 'custom/changedPassword',
  linkExpired: 'custom/linkExpired',
  sentEmail: 'custom/sentEmail'
};
var appCustomViews = app(configCustomViews);

var configTokenExpiration = JSON.parse(JSON.stringify(config));
configTokenExpiration.port = 5001;
configTokenExpiration.forgotPassword.tokenExpiration = '1 ms';
var appTokenExpiration = app(configTokenExpiration);

describe('# custom views', function() {

  before(function(done) {
    adapter.save('custom', 'custom@email.com', 'password', function() {
      done();
    });
  });

  describe('GET /forgot-password', function() {

    it('should work with custom views', function(done) {
      request(appCustomViews)
        .get('/forgot-password')
        .end(function(err, res) {
          if (err) {console.log(err); }
          res.text.should.containEql('Too bad you forgot your password!');
          done();
        });
    });

  });

  describe('POST /forgot-password', function() {

    // test the error view
    it('should work with custom view when something is wrong', function(done) {
      request(appCustomViews)
        .post('/forgot-password')
        .send({email: 'someemail.com'})
        .end(function(error, res) {
          res.text.should.containEql('Too bad you forgot your password!');
          done();
        });
    });

    // test the success view
    it('should work with custom views', function(done) {
      request(appCustomViews)
        .post('/forgot-password')
        .send({email: 'jim@wayne.com'})
        .end(function(error, res) {
          res.text.should.containEql('You\'ve got mail');
          done();
        });
    });

  });

  describe('GET /forgot-password/:token', function() {

    it('should work with custom views', function(done) {
      request(appCustomViews)
        .post('/forgot-password')
        .send({email: 'custom@email.com'})
        .end(function() {
          // get token from db
          adapter.find('name', 'custom', function(findErr, user) {
            if (findErr) {console.log(findErr); }
            // use GET request
            request(appCustomViews)
              .get('/forgot-password/' + user.pwdResetToken)
              .end(function(err, res) {
                if (err) {console.log(err); }
                res.text.should.containEql('Just choose a new one.');
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
      request(appCustomViews)
        .post('/forgot-password/' + token)
        .send({password: ''})
        .end(function(err, res) {
          if (err) {console.log(err); }
          res.text.should.containEql('Too bad you forgot your password!');
          done();
        });
    });

    // custom link expired template
    it('should render custom link expired template', function(done) {
      // create token
      request(appTokenExpiration)
        .post('/forgot-password')
        .send({email: 'custom@email.com'})
        .end(function() {
          // get token from db
          adapter.find('name', 'custom', function(findErr, user) {
            if (findErr) {console.log(findErr); }
            // use token from db for POST request
            request(appCustomViews)
              .post('/forgot-password/' + user.pwdResetToken)
              .send({password: 'something'})
              .end(function(err, res) {
                if (err) {console.log(err); }
                res.text.should.containEql('No no no! Not valid anymore.');
                done();
              });
          });
        });
    });

    it('should render custom success view', function(done) {
      // create token
      request(appCustomViews)
        .post('/forgot-password')
        .send({email: 'custom@email.com'})
        .end(function() {
          // get token from db
          adapter.find('name', 'custom', function(findErr, user) {
            if (findErr) {console.log(findErr); }
            // use token from db for POST request
            request(appCustomViews)
              .post('/forgot-password/' + user.pwdResetToken)
              .send({password: 'something'})
              .end(function(err, res) {
                if (err) {console.log(err); }
                res.text.should.containEql('Well done, bro!');
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
