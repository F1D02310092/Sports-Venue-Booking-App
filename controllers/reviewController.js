const ReviewModel = require("../models/Review.js");
const FieldModel = require("../models/Field.js");

const handleReviewPost = async (req, res) => {
   try {
      const field = await FieldModel.findOne({ fieldID: req.params.fieldID });

      if (!field) {
         req.flash("500 Something went wrong!");
         return res.redirect("/fields/");
      }

      const { text, rating } = req.body;

      if (rating < 1 || rating > 5) {
         req.flash("Value out of bound");
         return res.redirect(`/fields/${req.params.fieldID}`);
      }

      const newReview = new ReviewModel({
         text: text,
         rating: rating,
         user: req.user._id,
      });

      await newReview.save();
      field.reviews.push(newReview);
      await field.save();

      req.flash("success", "Review submitted!");
      return res.redirect(`/fields/${req.params.fieldID}`);
   } catch (error) {
      console.error(error);
      return res.send(500).status("Something went wrong!");
   }
};

const deleteReview = async (req, res) => {
   try {
      const review = await ReviewModel.findOne({ reviewID: req.params.reviewID });
      const field = await FieldModel.findOneAndUpdate({ fieldID: req.params.fieldID }, { $pull: { reviews: review._id } });

      if (!field) {
         return res.status(500).send("Something went wrong");
      }
      const deleted = await ReviewModel.findOneAndDelete({ reviewID: req.params.reviewID });

      if (deleted) {
         req.flash("success", "Successfully deleted a review!");
         return res.redirect(`/fields/${req.params.fieldID}`);
      } else {
         req.flash("error", "Failed to delete a review!");
         return res.redirect(`/fields/${req.params.fieldID}`);
      }
   } catch (error) {
      console.error(error);
      return res.status(500).send("Something went wrong");
   }
};

module.exports = {
   handleReviewPost,
   deleteReview,
};
