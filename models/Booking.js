const Booking = require("../schemas/bookingSchema.js");
const Field = require("../models/Field.js");

class BookingModel {
   // returns a Promise
   static async create(bookingData, options = {}) {
      if (!bookingData.user || !bookingData.field || !bookingData.date || !bookingData.startTime || !bookingData.endTime || !bookingData.totalPrice || !bookingData.status) {
         throw new Error("Missing booking data");
      }

      try {
         const newBooking = new Booking(bookingData);
         await newBooking.save(options);

         const fieldQuery = Field.findById(bookingData.field);
         if (options.session) fieldQuery.session(options.session);

         const field = await fieldQuery;
         if (field) {
            field.bookings.push(newBooking._id);
            await field.save(options);
         }

         return newBooking;
      } catch (error) {
         throw new Error(error);
      }
   }

   static async createManual(bookingData, options = {}) {
      if (!bookingData.manualContact || !bookingData.manualName || !bookingData.field || !bookingData.date || !bookingData.startTime || !bookingData.endTime || !bookingData.totalPrice || !bookingData.status) {
         throw new Error("Missing booking data");
      }

      try {
         const newBooking = new Booking(bookingData);
         await newBooking.save(options);

         const fieldQuery = Field.findById(bookingData.field);
         if (options.session) fieldQuery.session(options.session);

         const field = await fieldQuery;
         if (field) {
            field.bookings.push(newBooking._id);
            await field.save(options);
         }
         return newBooking;
      } catch (error) {
         throw new Error(error);
      }
   }

   static async findOne(query, options = {}) {
      return await Booking.findOne(query, null, options);
      // Arg 1: Cari berdasarkan query kondisi
      // Arg 2: Ambil semua field (null)
      // Arg 3: Gunakan settingan session ini
   }

   static async findOneAndPopulate(query, options = {}) {
      const q = Booking.findOne(query, null, options).populate("field").populate("user");
      if (options.session) q.session(options.session);

      return await q;

      // kalau q ga await artinya return Query Object
      // pakai await kalau mau Query Object tersebut menjadi data Key-Value Pair format
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

   // kalau method tidak dipanggil dalam transactions, maka tidak perlu session
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
