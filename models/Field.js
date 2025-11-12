const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const fieldSchema = new mongoose.Schema({
   fieldID: {
      type: String,
      default: uuidv4,
      required: true,
      unique: true,
   },
   bookings: [
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Booking",
      },
   ],
   name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
   },
   price: {
      type: Number,
      required: true,
      min: 0,
   },
   openTime: {
      type: Number,
      required: true,
   },
   closeTime: {
      type: Number,
      required: true,
   },
});

module.exports = mongoose.model("Field", fieldSchema);
