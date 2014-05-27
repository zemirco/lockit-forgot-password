# Lockit forgot password

[![Build Status](https://travis-ci.org/zemirco/lockit-forgot-password.svg?branch=master)](https://travis-ci.org/zemirco/lockit-forgot-password)
[![NPM version](https://badge.fury.io/js/lockit-forgot-password.svg)](http://badge.fury.io/js/lockit-forgot-password)
[![Dependency Status](https://david-dm.org/zemirco/lockit-forgot-password.svg)](https://david-dm.org/zemirco/lockit-forgot-password)

Help users who forgot their passwords for your Express app. The module is part of [Lockit](https://github.com/zemirco/lockit).

## Installation

`npm install lockit-forgot-password`

```js
var ForgotPassword = require('lockit-forgot-password');
var utils = require('lockit-utils');
var config = require('./config.js');

var db = utils.getDatabase(config);
var adapter = require(db.adapter)(config);

var app = express();

// express settings
// ...
// sessions are required - either cookie or some sort of db
app.use(cookieParser());
app.use(cookieSession({
  secret: 'this is my super secret string'
}));

// create new ForgotPassword instance
var forgotPassword = new ForgotPassword(config, adapter);

// use forgotPassword.router with your app
app.use(forgotPassword.router);
```

## Configuration

More about configuration at [Lockit](https://github.com/zemirco/lockit).

## Features

 - allow password reset for users
 - input validation
 - link expiration times
 - user email verification via unique token
 - hash password using [pbkdf2](http://nodejs.org/api/crypto.html#crypto_crypto_pbkdf2_password_salt_iterations_keylen_callback)
 - token format verification before database querying

## Routes included

 - GET /forgot-password
 - POST /forgot-password
 - GET /forgot-password/:token
 - POST /forgot-password/:token

## REST API

If you've set `exports.rest` in your `config.js` the module behaves as follows.

 - all routes have `/rest` prepended
 - `GET /rest/forgot-password` is `next()`ed and you can catch `/forgot-password` on the client
 - `POST /rest/forgot-password` stays the same but sends JSON
 - `GET /rest/forgot-password/:token` sends JSON and you can catch `/forgot-password/:token` on the client
 - `POST /rest/forgot-password/:token` sends JSON

## Test

`grunt`

## License

MIT
