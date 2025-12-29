const { RateLimiterMemory } = require("rate-limiter-flexible");

const registerSetting = new RateLimiterMemory({
   points: 3,
   duration: 24 * 60 * 60,
});

const authSetting = new RateLimiterMemory({
   points: 5,
   duration: 15 * 60,
});

const bookingSetting = new RateLimiterMemory({
   points: 10,
   duration: 60 * 60,
});

const globalSetting = new RateLimiterMemory({
   points: 20,
   duration: 1,
});

const rateLimiterMiddleware = (limiter, errorMsg) => {
   return (req, res, next) => {
      const key = req.ip;

      limiter
         .consume(key)
         .then(() => {
            next();
         })
         .catch((rateLimiterRes) => {
            if (req.accepts("html")) {
               req.flash("error", errorMsg);

               return res.redirect("/fields");
            } else {
               return res.status(429).json({
                  status: "fail",
                  message: "Too many requests",
               });
            }
         });
   };
};

module.exports = {
   registerLimiter: rateLimiterMiddleware(registerSetting, "You've reached account creation limit"),
   authLimiter: rateLimiterMiddleware(authSetting, "Too many attempts, please try again in 15 minutes"),
   bookingLimiter: rateLimiterMiddleware(bookingSetting, "You've reached the maximum booking limit, please book again in 1 hour"),
   globalLimiter: rateLimiterMiddleware(globalSetting, "Too many requests, please try again later"),
};
