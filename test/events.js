
var request = require('supertest');
var should = require('should');
var uuid = require('node-uuid');

var config = require('./app/config.js');
config.port = 7500;
var app = require('./app/app.js');
var _app = app(config);

describe('# event listeners', function() {

  before(function(done) {
    // create a user with verified email
    _app._adapter.save('event', 'event@email.com', 'password', function(err, user) {
      if (err) console.log(err);
      // verify email for event
      _app._adapter.find('name', 'event', function(err, user) {
        if (err) console.log(err);
        user.emailVerified = true;
        // save updated user to db
        _app._adapter.update(user, function(err, user) {
          if (err) console.log(err);
          done();
        });
      });
    });
  });

  describe('POST /forgot-password', function() {

    it('should emit a "forgot::sent" event', function(done) {
      _app._forgotPassword.on('forgot::sent', function(user, res) {
        user.name.should.equal('event');
        user.email.should.equal('event@email.com');
        done();
      });
      request(_app)
        .post('/forgot-password')
        .send({email: 'event@email.com'})
        .end(function(err, res) {
          res.statusCode.should.equal(200);
        });
    });

  });

  describe('POST /forgot-password/:token', function() {

    var token = '';

    // get token from db
    before(function(done) {
      _app._adapter.find('name', 'event', function(err, user) {
        if (err) console.log(err);
        token = user.pwdResetToken;
        done();
      });
    });

    it('should emit a "forgot::success" event', function(done) {
      _app._forgotPassword.removeAllListeners();
      _app._forgotPassword.on('forgot::success', function(user, res) {
        user.name.should.equal('event');
        user.email.should.equal('event@email.com');
        done();
      });
      request(_app)
        .post('/forgot-password/' + token)
        .send({password: 'new-password'})
        .end(function(err, res) {
          if (err) console.log(err);
          res.statusCode.should.equal(200);
        });
    });

  });

  after(function(done) {
    _app._adapter.remove('event', done);
  });

});
