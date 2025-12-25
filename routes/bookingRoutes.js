const express = require("express");
const { createBooking } = require("../controllers/bookingController");
const router = express.Router({ mergeParams: true });
const { isLoggedIn, zodValidate } = require("../middleware");
const { createBookingSchema } = require("../sanitization-validation/validate");
const { bookingLimiter } = require("../security/rateLimiter");

// base url -> /fields/:fieldID/users
router.route("/booking").post(isLoggedIn, bookingLimiter, zodValidate(createBookingSchema), createBooking);

module.exports = router;
