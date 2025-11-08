const User = require("../schemas/userSchema.js");

class UserModel {
   static async create(userData) {
      if (!userData.email || !userData.password || !userData.username) {
         req.flash("error", "Fill in all your credentials");
         return res.redirect("/register");
      }

      if (userData.password.length < 8 || /\s/.test(userData.password)) {
         req.flash("error", userData.password.length < 8 ? "Password must be at least 8 characters" : "Password cannot contain spaces");
         return res.redirect("/register");
      }

      return await User.register(new User({ email: userData.email, username: userData.username, role: userData.role || "user" }), userData.password);
   }

   static async findByEmail(email) {
      return await User.findOne({ email: email });
   }

   static async findById(id) {
      return await User.findById({ _id: id });
   }

   static isLocked(user) {
      return user.lockUntil && user.lockUntil > Date.now();
   }

   static async authenticate(email, password) {
      const user = await this.findByEmail(email);
      if (!user) {
         return { success: false, message: "Invalid email or password" };
      }

      if (this.isLocked(user)) {
         return { success: false, message: "Account locked. Try again later." };
      }

      const valid = await user.authenticate(password); // function dari passport-local-mongoose

      if (!valid.user) {
         user.loginAttempts = (user.loginAttempts || 0) + 1;

         if (user.loginAttempts >= 5) {
            user.lockUntil = Date.now() + 15 * 60 * 1000;
            await user.save();
            return { success: false, message: "Too many attempts. Account locked for 15 mins" };
         }

         await user.save();
         return { success: false, message: "Invalid email or password" };
      }

      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();

      return { success: true, user };
   }
}

module.exports = UserModel;
