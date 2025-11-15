const express = require("express");
const { getShowPage } = require("../controllers/fieldController");
const { isLoggedIn, isAdmin } = require("../middleware");
const { getManualBookForm, createManualBooking } = require("../controllers/adminController");
const router = express.Router();

// base url -> /admin/...
router.route("/fields/:fieldID").get(isLoggedIn, isAdmin, getShowPage);

router.route("/fields/:fieldID/m-booking").get(isLoggedIn, isAdmin, getManualBookForm).post(isLoggedIn, isAdmin, createManualBooking);

module.exports = router;
