# Lockit forgot password

[![Build Status](https://travis-ci.org/zeMirco/lockit-forgot-password.svg?branch=master)](https://travis-ci.org/zeMirco/lockit-forgot-password) [![NPM version](https://badge.fury.io/js/lockit-forgot-password.svg)](http://badge.fury.io/js/lockit-forgot-password)

Help users who forgot their passwords for your Express app. The module is part of [Lockit](https://github.com/zeMirco/lockit).

## Installation

`npm install lockit-forgot-password`

```js
var config = require('./config.js');
var forgotPassword = require('lockit-forgot-password');

var app = express();

// express settings
// ...

// sessions are required - either cookie or some sort of db
app.use(express.cookieParser('your secret here'));
app.use(express.cookieSession());
app.use(app.router);

// use middleware after router so it doesn't interfere with your own routes
forgotPassword(app, config);

// serve static files as last middleware
app.use(express.static(path.join(__dirname, 'public')));
```

## Configuration

More about configuration at [Lockit](https://github.com/zeMirco/lockit).

## Features

 - allow password reset for users
 - input validation
 - link expiration times
 - user email verification via unique token
 - hash password using [bcrypt](https://github.com/ncb000gt/node.bcrypt.js)
 - token format verification before database querying

## Routes included

 - GET /forgot-password
 - POST /forgot-password
 - GET /forgot-password/:token
 - POST /forgot-password/:token

## REST API

If you've set `exports.rest = true` in your `config.js` the module behaves as follows.

 - all routes have `/rest` prepended
 - `GET /rest/forgot-password` is `next()`ed and you can catch `/forgot-password` on the client
 - `POST /rest/forgot-password` stays the same but sends JSON
 - `GET /rest/forgot-password/:token` sends JSON and you can catch `/forgot-password/:token` on the client
 - `POST /rest/forgot-password/:token` sends JSON

## Test

`grunt`

## License

MIT
