const BookingModel = require("../models/Booking.js");
const mongoose = require("mongoose");
const FieldModel = require("../models/Field.js");
const { formatDateYYYYMMDD, parseLocalDateToUTC } = require("../utils/timeFormat.js");

const getManualBookForm = async (req, res) => {
   try {
      if (!req.query || !req.query.date || !req.query.slots) {
         req.flash("error", "Please select at least one slot");
         return res.redirect(`/admin/fields/${req.params.fieldID}`);
      }

      const field = await FieldModel.findOne({ fieldID: req.params.fieldID, isActive: true });
      if (!field) {
         return res.status(404).send("Not found");
      }

      let { date, slots } = req.query;

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
            req.flash("error", "Session(s) already passed!");
            return res.redirect(`/admin/fields/${req.params.fieldID}?date=${date}`);
         }
      }

      return res.render("admin/manual-book-form.ejs", { field, slots, date });
   } catch (error) {
      console.error(error);
   }
};

// cek conflict pas POST aja lgsg

const createManualBooking = async (req, res) => {
   const session = await mongoose.startSession();
   session.startTransaction();

   try {
      let { date, slots, manualName, manualContact } = req.body;

      if (!date || !slots) {
         req.flash("error", "Select at least one slot");
         return res.redirect(`/fields/${req.params.fieldID}`);
      }

      const field = await FieldModel.findOne({ fieldID: req.params.fieldID, isActive: true }).session(session);

      if (!field) {
         await session.abortTransaction();
         return res.status(404).send("Not found");
      }

      if (!Array.isArray(slots)) {
         slots = slots.split(",");
      }
      slots = slots.map(Number);

      const bookingDateUTC = parseLocalDateToUTC(date);

      const conflictBooking = await BookingModel.findOne(
         {
            field: field._id,
            date: bookingDateUTC,
            slots: { $in: slots },
            status: "success",
         },
         { session }
      );

      if (conflictBooking) {
         await session.abortTransaction();
         req.flash("error", "Session(s) are already booked");
         return res.redirect(`/admin/field/${req.params.fieldID}?date=${date}`);
      }

      const dateOfToday = formatDateYYYYMMDD(new Date());
      if (date === dateOfToday) {
         const now = new Date();
         const minutes = now.getHours() * 60 + now.getMinutes();

         const invalidSlots = slots.filter((el) => {
            return el <= minutes;
         });

         if (invalidSlots.length > 0) {
            req.flash("error", "Session(s) already passed!");
            return res.redirect(`/admin/fields/${req.params.fieldID}?date=${date}`);
         }
      }

      const bookingData = {
         field: field._id,
         manualName: manualName,
         manualContact: manualContact,
         date: new Date(date),
         slots: slots,
         startTime: slots[0],
         endTime: slots[slots.length - 1] + 60,
         totalPrice: field.price * slots.length,
         status: "success",
      };

      await BookingModel.createManual(bookingData, { session });

      await BookingModel.updateMany(
         {
            field: field._id,
            date: new Date(date),
            slots: { $in: slots },
            status: "pending",
         },
         { status: "failed" },
         { session }
      );

      await session.commitTransaction();
      return res.redirect(`/admin/fields/${req.params.fieldID}`);
   } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      console.error("Manual Booking Error:", error);

      if (error.code === 11000) {
         req.flash("error", "System blocked double booking.");
      } else {
         req.flash("error", "Error creating booking");
      }
      return res.send(":(");
   } finally {
      session.endSession();
   }
};

module.exports = {
   getManualBookForm,
   createManualBooking,
};
