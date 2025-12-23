const express = require("express");
const { getShowPage } = require("../controllers/fieldController");
const { isLoggedIn, isAdmin, zodValidate } = require("../middleware");
const { getManualBookForm, createManualBooking } = require("../controllers/adminController");
const { reactivateField } = require("../controllers/fieldController");
const { getAnalyticsPage } = require("../controllers/analyticsContoller");
const { getPaymentHistory, getPaymentDetails } = require("../controllers/paymentController");
const { manualBookingSchema } = require("../sanitization-validation/validate");
const router = express.Router();

// base url -> /admin/...
router.route("/analytics").get(isLoggedIn, isAdmin, getAnalyticsPage);

router.route("/analytics/transactions-history").get(isLoggedIn, isAdmin, getPaymentHistory);

router.route("/analytics/transactions-history/details/:bookingID").get(isLoggedIn, isAdmin, getPaymentDetails);

router.route("/fields/:fieldID").get(isLoggedIn, isAdmin, getShowPage);

router.route("/fields/:fieldID/reactivate").post(isLoggedIn, isAdmin, reactivateField);

router.route("/fields/:fieldID/m-booking").get(isLoggedIn, isAdmin, getManualBookForm).post(isLoggedIn, isAdmin, zodValidate(manualBookingSchema), createManualBooking);

module.exports = router;
