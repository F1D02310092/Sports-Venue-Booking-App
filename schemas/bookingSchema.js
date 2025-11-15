const mongoose = require("mongoose");
const { v4: uuid } = require("uuid");

const bookingSchema = new mongoose.Schema(
   {
      bookingID: {
         type: String,
         required: true,
         unique: true,
         default: uuid,
      },
      user: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         // tidak required karena bisa manual booking
      },
      field: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Field",
         required: true,
      },
      date: {
         type: Date,
         required: true,
      },
      slots: [
         {
            type: Number,
            required: true,
         },
      ],
      startTime: {
         type: Number,
         required: true,
         min: 0,
         max: 1439,
      },
      endTime: {
         type: Number,
         required: true,
         min: 0,
         max: 1439,
      },
      totalPrice: {
         type: Number,
         min: 0,
         required: true,
      },
      status: {
         type: String,
         enum: ["success", "pending", "failed"],
         default: "pending",
         required: true,
      },

      // utk Midtrans
      orderID: {
         type: String,
      },
      transactionID: {
         type: String,
      },
      payementToken: {
         type: String,
      },
      paymentTime: {
         type: Date,
      },
      redirectURL: {
         type: String,
      },

      // utk manual booking
      manualName: {
         type: String,
         trim: true,
      },
      manualContact: {
         type: String,
         trim: true,
      },
   },
   { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
