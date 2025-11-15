const express = require("express");
const { createBooking } = require("../controllers/bookingController");
const router = express.Router({ mergeParams: true });
const { isLoggedIn } = require("../middleware");

// base url -> /fields/:fieldID/users
router.route("/booking").post(isLoggedIn, createBooking);

module.exports = router;
