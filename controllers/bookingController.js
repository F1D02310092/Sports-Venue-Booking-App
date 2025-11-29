const mongoose = require("mongoose");
const BookingModel = require("../models/Booking.js");
const FieldModel = require("../models/Field.js");
const { parseLocalDateToUTC, formatDateYYYYMMDD } = require("../utils/timeFormat.js");

const createBooking = async (req, res) => {
   // masih banyak egde cases yang harus di-handle
   // race-condition

   const session = await mongoose.startSession();
   session.startTransaction();

   try {
      const field = await FieldModel.findOne({ fieldID: req.params.fieldID, isActive: true }).session(session);
      if (!field) {
         await session.abortTransaction();
         return res.status(404).send("Page not found!");
      }

      let { date, slots } = req.body;

      if (!date || !slots) {
         req.flash("error", "Select at least one slot");
         return res.redirect(`/fields/${req.params.fieldID}`);
      }

      const bookingDateUTC = parseLocalDateToUTC(date);

      if (!Array.isArray(slots)) {
         slots = [slots];
      }
      slots = slots.map(Number);

      const dateOfToday = formatDateYYYYMMDD(new Date());

      if (date === dateOfToday) {
         const now = new Date();
         const minutes = now.getHours() * 60 + now.getMinutes();

         const invalidSlots = slots.filter((el) => {
            return el <= minutes;
         });

         if (invalidSlots.length > 0) {
            await session.abortTransaction();
            req.flash("error", "Session(s) already passed!");
            return res.redirect(`/fields/${req.params.fieldID}?date=${date}`);
         }
      }

      const soldOut = await BookingModel.findOne(
         {
            field: field._id,
            date: bookingDateUTC,
            slots: { $in: slots },
            status: "success",
         },
         { session }
      );

      if (soldOut) {
         await session.abortTransaction();
         req.flash("error", "Slot was just booked by another user.");
         return res.redirect(`/fields/${req.params.fieldID}?date=${date}`);
      }

      const userPending = await BookingModel.findOne(
         {
            field: field._id,
            user: req.user._id,
            date: bookingDateUTC,
            slots: { $in: slots },
            status: "pending",
         },
         { session }
      );

      if (userPending) {
         if (userPending.expiredAt < new Date()) {
            userPending.status = "failed";
            await userPending.save({ session });
            await session.commitTransaction(); // Commit the fail status

            req.flash("error", "Previous booking expired. Please try again.");
            return res.redirect(`/fields/${req.params.fieldID}`);
         } else {
            // Still active pending
            await session.abortTransaction();
            req.flash("error", "You've already book some session(s). Please finish payment.");
            return res.redirect(`/payment/create/${userPending.bookingID}`);
         }
      }

      const now = new Date();
      const bookingData = {
         field: field._id,
         user: req.user._id,
         date: new Date(date),
         slots: slots,
         startTime: slots[0],
         endTime: slots[slots.length - 1] + 60,
         totalPrice: field.price * slots.length,
         status: "pending",
         expiredAt: new Date(now.getTime() + 1000 * 60 * 10), // 10 min
      };

      const newBooking = await BookingModel.create(bookingData, { session });

      await session.commitTransaction();

      return res.redirect(`/payment/create/${newBooking.bookingID}`);
   } catch (error) {
      if (session.inTransaction()) {
         await session.abortTransaction();
      }
      console.error(error);
      return res.send(":(");
   } finally {
      session.endSession();
   }
};

module.exports = {
   createBooking,
};
