const express = require("express");
const { handleReviewPost, deleteReview } = require("../controllers/reviewController");
const { isLoggedIn, isReviewAuthor, zodValidate } = require("../middleware");
const router = express.Router({ mergeParams: true });
const { reviewSchema } = require("../sanitization-validation/validate");

// base url -> /fields/:fieldID/review
router.route("/").post(isLoggedIn, zodValidate(reviewSchema), handleReviewPost);

router.route("/:reviewID").delete(isLoggedIn, isReviewAuthor, deleteReview);

module.exports = router;
