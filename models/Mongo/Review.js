const mongoose = require("mongoose");
const { v4: uuid } = require("uuid");

const reviewSchema = new mongoose.Schema({
   user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
   },
   text: {
      type: String,
      required: true,
      trim: true,
   },
   rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
   },
   reviewID: {
      type: String,
      required: true,
      unique: true,
      default: uuid,
   },
});

reviewSchema.set("strictQuery", true);

module.exports = mongoose.model("Review", reviewSchema);
