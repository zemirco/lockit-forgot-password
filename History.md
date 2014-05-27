
##### 1.1.1 / 2014-05-27

- set `autocomplete="off"`
- use Bootstrap responsive classes

##### 1.1.0 / 2014-05-23

- refactor code
- update dependencies
- use updated [lockit-sendmail](https://github.com/zeMirco/lockit-sendmail)

##### 1.0.0 / 2014-04-19

- requires Express 4.x
- makes use of `express.Router()`. No need to pass `app` around as argument.

  **old**

  ```js
  var ForgotPassword = require('lockit-forgot-password');

  var forgotPassword = new ForgotPassword(app, config, adapter);
  ```

  **new**

  ```js
  var ForgotPassword = require('lockit-forgot-password');

  var forgotPassword = new ForgotPassword(config, adapter);
  app.use(forgotPassword.router);
  ```

- proper Error handling. All Errors are piped to next middleware.

  **old**

  ```js
  if (err) console.log(err);
  ```

  **new**

  ```js
  if (err) return next(err);
  ```

  Make sure you have some sort of error handling middleware at the end of your
  routes (is included by default in Express 4.x apps if you use the `express-generator`).

##### 0.5.0 / 2014-04-11

- `username` becomes `name`
