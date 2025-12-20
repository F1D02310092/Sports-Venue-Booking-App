const ReviewModel = require("./models/Mongo/Review.js");

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

const isUser = async (req, res, next) => {
   if (req.user.role !== "user") {
      return res.status(403).send("Restricted access");
   }
   next();
};

const isReviewAuthor = async (req, res, next) => {
   const review = await ReviewModel.findOne({ reviewID: req.params.reviewID });
   if (!review) {
      return res.status(500).send("Something went wrong!");
   }

   if (!review.user.equals(req.user.user_id)) {
      req.flash("error", "401 Forbidden request");
      return res.redirect(`/fields/${req.params.fieldID}`);
   }

   next();
};

module.exports = {
   storeReturnTo,
   isLoggedIn,
   isAdmin,
   isReviewAuthor,
   isUser,
};
