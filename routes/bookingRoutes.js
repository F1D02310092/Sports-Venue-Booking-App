const express = require("express");
const { createBooking } = require("../controllers/bookingController");
const router = express.Router({ mergeParams: true });

// base url -> /fields/:fieldID/users
router.route("/booking").post(createBooking);

module.exports = router;
