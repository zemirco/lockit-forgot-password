exports.appname = 'beachbapp';
exports.url = 'http://localhost:3000';
exports.port = 3000; // Todo: use port instead full url

// email settings
exports.emailType = 'Stub';
exports.emailSettings = {
  service: 'none',
  auth: {
    user: 'none',
    pass: 'none'
  }
};

// signup settings
exports.signupRoute = '/signup';
exports.signupTokenExpiration = 24 * 60 * 60 * 1000;

// forgot password settings
exports.forgotPasswordRoute = '/forgot-password';
exports.forgotPasswordTokenExpiration = 24 * 60 * 60 * 1000;

// settings for test
exports.db = 'couchdb';
exports.dbUrl = 'http://127.0.0.1:5984/test';

// signup process -> resend email with verification link
exports.emailResendVerification = {
  title: 'Complete your registration at <%- appname %>',
  text:
    '<h2>Hello <%- username %></h2>' +
    'here is the link again. <%- link %> to complete your registration at <%- appname %>.' +
    '<p>The <%- appname %> Team</p>'
};

// forgot password
exports.emailForgotPassword = {
  title: 'Reset your password',
  text:
    '<h2>Hey <%- username %></h2>' +
    '<%- link %> to reset your password.' +
    '<p>The <%- appname %> Team</p>'
};