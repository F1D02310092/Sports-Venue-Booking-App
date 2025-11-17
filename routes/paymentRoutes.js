const express = require("express");
const router = express.Router();
const { createPayment, handlePaymentNotification, paymentSuccess, paymentPending, paymentFailed, showPaymentPage, getUserPaymentHistory, cancelBooking, getPaymentDetails } = require("../controllers/paymentController");
const { isLoggedIn } = require("../middleware");

// base url -> /payment/
router.route("/create/:bookingID").get(isLoggedIn, showPaymentPage);

router.route("/create").post(isLoggedIn, createPayment);

router.route("/notification").post(handlePaymentNotification);

router.route("/success").get(isLoggedIn, paymentSuccess);

router.route("/pending").get(isLoggedIn, paymentPending);

router.route("/failed").get(isLoggedIn, paymentFailed);

router.route("/cancel/:bookingID").post(isLoggedIn, cancelBooking);

router.route("/details/:bookingID").get(isLoggedIn, getPaymentDetails);

// Transactions analytics
router.route("/users/transactions-history").get(isLoggedIn, getUserPaymentHistory);

module.exports = router;
