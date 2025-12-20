const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const imageSchema = new mongoose.Schema({
   url: String,
   filename: String,
});

imageSchema.virtual("thumbnail").get(function () {
   return this.url.replace("/upload", "/upload/w_700/h_700");
});
const opts = { toJSON: { virtual: true } };

const fieldSchema = new mongoose.Schema(
   {
      fieldID: {
         type: String,
         default: uuidv4,
         required: true,
         unique: true,
      },
      bookings: [
         {
            type: String,
         },
      ],
      reviews: [
         {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review",
         },
      ],
      images: [imageSchema],
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
      isActive: { type: Boolean, default: true },
   },
   opts
);

module.exports = mongoose.model("Field", fieldSchema);
