const UserModel = require("../models/User.js");

const getRegisterPage = (req, res) => {
   return res.render("auth/register.ejs");
};

const handleRegistration = async (req, res) => {
   try {
      const { username, email, password } = req.body;

      const userData = {
         username,
         email,
         password,
      };

      await UserModel.create(userData);

      req.flash("success", "Successfully register");
      return res.redirect("/login");
   } catch (error) {
      if (error.name === "UserExistsError") {
         req.flash("error", "Email already registered!");
      } else {
         console.log(error);
         req.flash("error", "Something went wrong!");
      }
      return res.redirect("/register");
   }
};

const getLoginPage = (req, res) => {
   return res.render("auth/login.ejs");
};

const handleLogin = async (req, res, next) => {
   req.flash("success", "Successfully logged-in");

   const redirectUrl = res.locals.returnTo || "/fields";

   return res.redirect(redirectUrl);
};

const handleLogout = async (req, res, next) => {
   req.logOut(function (err) {
      if (err) {
         console.log(err);
         return res.redirect("/fields");
      }

      req.flash("Logged Out!");
      return res.redirect("/fields");
   });
};

module.exports = {
   getRegisterPage,
   getLoginPage,
   handleRegistration,
   handleLogin,
   handleLogout,
};
