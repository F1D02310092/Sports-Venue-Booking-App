const Booking = require("../schemas/bookingSchema.js");
const Field = require("../models/Field.js");

class BookingModel {
   // returns a Promise
   static async create(bookingData) {
      if (!bookingData.user || !bookingData.field || !bookingData.date || !bookingData.startTime || !bookingData.endTime || !bookingData.totalPrice || !bookingData.status) {
         throw new Error("Missing booking data");
      }

      try {
         const newBooking = new Booking(bookingData);
         const field = await Field.findById(bookingData.field);

         field.bookings.push(newBooking);
         await newBooking.save();
         await field.save();
         return newBooking;
      } catch (error) {
         throw new Error(error);
      }
   }

   static async findOne(fieldID, userID, date, slots, status) {
      return await Booking.findOne(fieldID, userID, date, slots, status);
   }

   static async find(id) {
      return await Booking.find(id);
   }
}

module.exports = BookingModel;
