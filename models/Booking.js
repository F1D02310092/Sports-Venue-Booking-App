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

   static async createManual(bookingData) {
      if (!bookingData.manualContact || !bookingData.manualName || !bookingData.field || !bookingData.date || !bookingData.startTime || !bookingData.endTime || !bookingData.totalPrice || !bookingData.status) {
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

   static async findOne(query) {
      return await Booking.findOne(query);
   }

   static async findOneAndPopulate(query) {
      return await Booking.findOne(query).populate("field").populate("user");
   }

   static async findOneAndUpdate(query, updateData, options = {}) {
      try {
         const booking = await Booking.findOneAndUpdate(query, updateData, {
            runValidators: true,
            ...options,
         });

         return booking;
      } catch (error) {
         throw new Error(`Failed: ${error.message}`);
      }
   }

   static async updateMany(query, updateData, options = {}) {
      try {
         const result = await Booking.updateMany(query, updateData, {
            runValidators: true,
            ...options,
         });

         return result; // hasilnya berisi matchedCount, modifiedCount, dll
      } catch (error) {
         throw new Error(`Failed to update booking: ${error.message}`);
      }
   }

   static async find(id) {
      return await Booking.find(id);
   }

   static findAllByQuery(query) {
      return Booking.find(query); // returns query object

      // method utk handle `Chained Query Builder` ditulis sebagai method biasa (bukan async), sehingga tidak ada keyword `await`
   }

   static async countDocuments(query) {
      return await Booking.countDocuments(query);
   }
}

module.exports = BookingModel;
