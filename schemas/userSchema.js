const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const { v4: uuidv4 } = require("uuid");

const userSchema = new mongoose.Schema({
   username: {
      type: String,
      required: true,
      trim: true,
   },
   email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
   },
   role: {
      type: String,
      enum: ["user", "admin"],
      required: true,
      default: "user",
   },
   userID: {
      type: String,
      required: true,
      unique: true,
      default: uuidv4,
   },
});

userSchema.plugin(passportLocalMongoose, {
   usernameField: "email",
});

module.exports = mongoose.model("User", userSchema);
