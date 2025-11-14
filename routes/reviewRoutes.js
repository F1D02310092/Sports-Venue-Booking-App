const express = require("express");
const { handleReviewPost, deleteReview } = require("../controllers/reviewController");
const { isLoggedIn, isReviewAuthor } = require("../middleware");
const router = express.Router({ mergeParams: true });

// base url -> /fields/:fieldID/review
router.route("/").post(isLoggedIn, handleReviewPost);

router.route("/:reviewID").delete(isLoggedIn, isReviewAuthor, deleteReview);

module.exports = router;
