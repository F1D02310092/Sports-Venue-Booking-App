const ReviewModel = require("./models/Mongo/Review.js");
const { z } = require("zod");

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

const zodValidate = (schema) => (req, res, next) => {
   try {
      const result = schema.parse({
         body: req.body,
         query: req.query,
         params: req.params,
      });

      req.body = result.body;
      req.query = result.query;
      req.params = result.params;

      next();
   } catch (error) {
      if (error instanceof z.ZodError) {
         return res.status(400).send(error);
      }

      console.error(error);
      return res.status(500).send("Internal server error");
   }
};

module.exports = {
   storeReturnTo,
   isLoggedIn,
   isAdmin,
   isReviewAuthor,
   isUser,
   zodValidate,
};
