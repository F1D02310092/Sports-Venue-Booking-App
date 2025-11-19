const express = require("express");
const router = express.Router();
const passport = require("passport");
const { getRegisterPage, getLoginPage, handleLogin, handleRegistration, handleLogout, getProfilePage, handleUpdateProfile } = require("../controllers/authController");
const { storeReturnTo, isLoggedIn } = require("../middleware");

router.route("/register").get(getRegisterPage).post(handleRegistration);

router
   .route("/login")
   .get(getLoginPage)
   .post(storeReturnTo, passport.authenticate("local", { failureFlash: true, failureRedirect: "/login" }), handleLogin);

router.get("/logout", isLoggedIn, handleLogout);

router.route("/users/:userID/profile").get(isLoggedIn, getProfilePage);
router.route("/users/:userID/").put(isLoggedIn, handleUpdateProfile);

module.exports = router;
