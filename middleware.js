const storeReturnTo = async (req, res, next) => {
   if (!req.session.returnTo && req.originalUrl !== "/login") {
      req.session.returnTo = req.originalUrl;
   }

   if (req.session.returnTo) {
      res.locals.returnTo = req.session.returnTo;
   }
   next();
};

const isLoggedIn = async (req, res, next) => {
   if (!req.isAuthenticated()) {
      req.session.returnTo = req.originalUrl;
      req.flash("error", "Please login first!");
      return res.redirect("/login");
   }

   next();
};

const isAdmin = async (req, res, next) => {
   if (req.user.role !== "admin") {
      return res.status(403).send("Forbidden request!");
   }

   next();
};

module.exports = {
   storeReturnTo,
   isLoggedIn,
   isAdmin,
};
