const express = require("express");
const { getShowPage } = require("../controllers/fieldController");
const { isLoggedIn, isAdmin } = require("../middleware");
const { getManualBookForm, createManualBooking } = require("../controllers/adminController");
const { reactivateField } = require("../controllers/fieldController");
const { getAnalyticsPage } = require("../controllers/analyticsContoller");
const router = express.Router();

// base url -> /admin/...
router.route("/analytics").get(isLoggedIn, isAdmin, getAnalyticsPage);

router.route("/fields/:fieldID").get(isLoggedIn, isAdmin, getShowPage);

router.route("/fields/:fieldID/reactivate").post(isLoggedIn, isAdmin, reactivateField);

router.route("/fields/:fieldID/m-booking").get(isLoggedIn, isAdmin, getManualBookForm).post(isLoggedIn, isAdmin, createManualBooking);

module.exports = router;
