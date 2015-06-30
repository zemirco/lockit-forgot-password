'use strict';

var request = require('supertest');
var should = require('should'); // eslint-disable-line no-unused-vars
var utls = require('lockit-utils');

var config = require('./app/config.js');
var app = require('./app/app.js');

var db = utls.getDatabase(config);
var adapter = require(db.adapter)(config);

var configRoutes = JSON.parse(JSON.stringify(config));
configRoutes.port = 9100;
configRoutes.forgotPassword.tokenExpiration = '1 hour';
configRoutes.forgotPassword.route = '/cannot-remember';
var appRoutes = app(configRoutes);

describe('#custom routes', function() {

  before(function(done) {
    adapter.save('routes', 'routes@email.com', 'password', function() {
      adapter.find('name', 'routes', function(err, user) {
        if (err) {console.log(err); }
        user.emailVerified = true;
        adapter.update(user, done);
      });
    });
  });

  describe('GET /forgot-password', function() {

    it('should work with custom routes', function(done) {
      request(appRoutes)
        .get('/cannot-remember')
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

    it('should work with custom routes', function(done) {
      request(appRoutes)
        .post('/cannot-remember')
        .send({email: 'routes@email.com'})
        .end(function(error, res) {
          res.statusCode.should.equal(200);
          res.text.should.containEql('Email with link for password reset sent.');
          done();
        });
    });

  });

  describe('GET /forgot-password/:token', function() {

    it('should work with custom routes', function(done) {
      adapter.find('name', 'routes', function(findErr, user) {
        if (findErr) {console.log(findErr); }
        request(appRoutes)
          .get('/cannot-remember/' + user.pwdResetToken)
          .end(function(err, res) {
            if (err) {console.log(err); }
            res.text.should.containEql('Create a new password');
            done();
          });
      });
    });

  });

  describe('POST /forgot-password/:token', function() {

    it('should work with custom routes', function(done) {
      adapter.find('name', 'routes', function(findErr, user) {
        if (findErr) {console.log(findErr); }
        request(appRoutes)
          .post('/cannot-remember/' + user.pwdResetToken)
          .send({password: 'new Password'})
          .end(function(err, res) {
            if (err) {console.log(err); }
            res.statusCode.should.equal(200);
            res.text.should.containEql('You have successfully changed your password');
            done();
          });
      });
    });

  });

  after(function(done) {
    adapter.remove('routes', done);
  });

});
