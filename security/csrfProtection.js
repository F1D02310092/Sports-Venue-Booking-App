const { csrfSync } = require("csrf-sync");

const {
   generateToken, // Use this in your routes to generate, store, and get a CSRF token.
   csrfSynchronisedProtection, // This is the default CSRF protection middleware.
} = csrfSync({
   getTokenFromRequest: (req) => {
      return req.body?._csrf || req.query?._csrf || req.headers["x-csrf-token"];
   },
});

module.exports = { csrfSynchronisedProtection, generateToken };
