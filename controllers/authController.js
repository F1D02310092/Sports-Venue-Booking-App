const UserModel = require("../models/Postgres/User.js");

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

      req.flash("success", "Logged Out!");
      return res.redirect("/fields");
   });
};

const getProfilePage = async (req, res) => {
   const user = await UserModel.findByUserId(req.params.userID);
   if (!user) {
      return res.status(404).send("Not Found!");
   }

   return res.render("auth/profile.ejs", { user });
};

const handleUpdateProfile = async (req, res) => {
   try {
      const user = await UserModel.findByUserId(req.params.userID);
      if (!user) {
         return res.status(404).send("Not Found!");
      }

      const { username, password, newPassword } = req.body;

      if (username && username !== user.username) {
         await UserModel.update(user.user_id, { username });
      }

      if (password && newPassword) {
         await UserModel.changePassword(user.user_id, password, newPassword);
         req.flash("success", "Password changed successfully");
      } else if (username) {
         req.flash("success", "Profile updated successfully");
      }

      req.flash("success", "Successfully change password");
      return res.redirect("/fields");
   } catch (error) {
      console.error(error);

      return res.send(error);
   }
};

module.exports = {
   getRegisterPage,
   getLoginPage,
   handleRegistration,
   handleLogin,
   handleLogout,
   getProfilePage,
   handleUpdateProfile,
};
