const express = require("express");
const router = express.Router();
const passport = require("passport");
const { getRegisterPage, getLoginPage, handleLogin, handleRegistration, handleLogout } = require("../controllers/authController");
const { storeReturnTo, isLoggedIn } = require("../middleware");

router.route("/register").get(getRegisterPage).post(handleRegistration);

router
   .route("/login")
   .get(getLoginPage)
   .post(storeReturnTo, passport.authenticate("local", { failureFlash: true, failureRedirect: "/login" }), handleLogin);

router.get("/logout", isLoggedIn, handleLogout);

module.exports = router;
