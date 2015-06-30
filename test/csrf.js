'use strict';

var request = require('supertest');
var should = require('should'); // eslint-disable-line no-unused-vars
var cookie = require('cookie');
var utls = require('lockit-utils');

var config = require('./app/config.js');
var app = require('./app/app.js');

var db = utls.getDatabase(config);
var adapter = require(db.adapter)(config);

var _config = JSON.parse(JSON.stringify(config));
_config.port = 9000;
_config.csrf = true;
_config.forgotPassword.tokenExpiration = '10 ms';
var _app = app(_config);

// second app without csrf so we can easily make a POST request to create token
var configWithoutCSRF = JSON.parse(JSON.stringify(config));
configWithoutCSRF.port = 9001;
configWithoutCSRF.forgotPassword.tokenExpiration = '1 hour';
var appWithoutCSRF = app(configWithoutCSRF);

describe('# csrf', function() {

  before(function(done) {
    adapter.save('csrf', 'csrf@email.com', 'password', function() {
      adapter.find('name', 'csrf', function(err, user) {
        if (err) {console.log(err); }
        user.emailVerified = true;
        adapter.update(user, done);
      });
    });
  });

  describe('GET /forgot-password', function() {

    it('should include the token in the view', function(done) {
      request(_app)
        .get('/forgot-password')
        .end(function(err, res) {
          if (err) {console.log(err); }
          var cookies = cookie.parse(res.headers['set-cookie'][0]);
          var token = cookies.csrf;
          res.text.should.containEql('name="_csrf" value="' + token + '"');
          done();
        });
    });

  });

  describe('GET /forgot-password/:token', function() {

    it('should include the token in the view', function(done) {
      // create token
      request(appWithoutCSRF)
        .post('/forgot-password')
        .send({email: 'csrf@email.com'})
        .end(function() {
          // find token
          adapter.find('name', 'csrf', function(err, user) {
            if (err) {console.log(err); }
            request(_app)
              .get('/forgot-password/' + user.pwdResetToken)
              .end(function(error, res) {
                if (error) {console.log(error); }
                var cookies = cookie.parse(res.headers['set-cookie'][0]);
                var token = cookies.csrf;
                res.text.should.containEql('name="_csrf" value="' + token + '"');
                done();
              });
          });
        });
    });

  });

  after(function(done) {
    adapter.remove('csrf', done);
  });

});
