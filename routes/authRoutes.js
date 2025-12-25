const express = require("express");
const router = express.Router();
const passport = require("passport");
const { getRegisterPage, getLoginPage, handleLogin, handleRegistration, handleLogout, getProfilePage, handleUpdateProfile } = require("../controllers/authController");
const { storeReturnTo, isLoggedIn, zodValidate } = require("../middleware");
const { registerSchema, loginSchema, updateProfileSchema } = require("../sanitization-validation/validate");
const { registerLimiter, authLimiter } = require("../security/rateLimiter");

router.route("/register").get(getRegisterPage).post(registerLimiter, zodValidate(registerSchema), handleRegistration);

router
   .route("/login")
   .get(getLoginPage)
   .post(authLimiter, zodValidate(loginSchema), storeReturnTo, passport.authenticate("local", { failureFlash: true, failureRedirect: "/login" }), handleLogin);

router.get("/logout", isLoggedIn, handleLogout);

router.route("/users/:userID/profile").get(isLoggedIn, getProfilePage);
router.route("/users/:userID/").put(isLoggedIn, zodValidate(updateProfileSchema), handleUpdateProfile);

module.exports = router;
