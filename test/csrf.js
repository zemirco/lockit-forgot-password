
var request = require('supertest');
var should = require('should');
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
var _config_two = JSON.parse(JSON.stringify(config));
_config_two.port = 9001;
_config_two.forgotPassword.tokenExpiration = '1 hour';
var _app_two = app(_config_two);

describe('# csrf', function() {

  before(function(done) {
    adapter.save('csrf', 'csrf@email.com', 'password', function() {
      adapter.find('name', 'csrf', function(err, user) {
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
      request(_app_two)
        .post('/forgot-password')
        .send({email: 'csrf@email.com'})
        .end(function() {
          // find token
          adapter.find('name', 'csrf', function(err, user) {
            request(_app)
              .get('/forgot-password/' + user.pwdResetToken)
              .end(function(err, res) {
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
