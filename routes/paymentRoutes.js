const express = require("express");
const router = express.Router();
const { createPayment, handlePaymentNotification, paymentSuccess, showPaymentPage, getPaymentHistory, cancelBooking, getPaymentDetails } = require("../controllers/paymentController");
const { isLoggedIn, isUser } = require("../middleware");

// base url -> /payment/
router.route("/create/:bookingID").get(isLoggedIn, isUser, showPaymentPage);

router.route("/create").post(isLoggedIn, isUser, createPayment);

router.route("/notification").post(handlePaymentNotification);

router.route("/success").get(isLoggedIn, isUser, paymentSuccess);

router.route("/cancel/:bookingID").post(isLoggedIn, isUser, cancelBooking);

router.route("/details/:bookingID").get(isLoggedIn, isUser, getPaymentDetails);

// Transactions analytics
router.route("/users/transactions-history").get(isLoggedIn, isUser, getPaymentHistory);

module.exports = router;
