## What do I get?

 - [GET /forgot-password](#get-forgot-password)
 - [POST /forgot-password](#post-forgot-password)
 - [GET /forgot-password/:token]()
 - [POST /forgot-password/:token]()

#### GET /forgot-password

 - render `get-forgot-password` template with input field for `email`

#### POST /forgot-password

 - verify that `email` isn't empty and is a valid email address
 - find user with given `email` in database
 - no user found -> render `post-forgot-password` template with success message to pretend we've sent an email
 - delete old password hash
 - create the `token` and expiration date for `token`
 - save new user details to db
 - send an email with link containing the `token`
 - render `post-forgot-password` template containing success message

#### GET /forgot-password/:token

 - verify format of `token`
 - `token` has the wrong format -> continue with error handling middleware
 - find user with given `token` in db
 - no user found -> continue with error handling middleware
 - check if token has expired
 - token has expired -> delete token and token expiration date for user
 - token has expired -> save user to db and render `link-expired` template
 - render `get-new-password` template with input field for `password`

#### POST /forgot-password/:token

 - check for `token`
 - no `token` found -> continue with error handling middleware
 - verify format of `token`
 - `token` has the wrong format -> continue with error handling middleware
 - find user with given `token` in db
 - no user found -> continue with error handling middleware
 - create hash of given `password` with bcrypt
 - delete token and token expiration date for user
 - save new user details to db
 - render `change-password-success` template with success message