const BookingModel = require("../models/Booking.js");
const FieldModel = require("../models/Field.js");
const { parseLocalDateToUTC, formatDateYYYYMMDD } = require("../utils/timeFormat.js");

const createBooking = async (req, res) => {
   // masih banyak egde cases yang harus di-handle
   // race-condition

   try {
      const field = await FieldModel.findOne({ fieldID: req.params.fieldID, isActive: true });
      if (!field) {
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
            req.flash("error", "Session(s) already passed!");
            return res.redirect(`/fields/${req.params.fieldID}?date=${date}`);
         }
      }

      const conflictBooking = await BookingModel.findOne({
         field: field._id,
         user: req.user._id,
         date: bookingDateUTC,
         slots: { $in: slots },
         status: "pending",
      });

      if (conflictBooking && conflictBooking.expiredAt < new Date()) {
         req.flash("error", "Your book is expired, please make new book");
         conflictBooking.status = "failed";
         await conflictBooking.save();
         return res.redirect(`/fields/${req.params.fieldID}`);
      }

      if (conflictBooking) {
         req.flash("error", `Some sessions are already booked, please finish payment`);
         return res.redirect(`/payment/create/${conflictBooking.bookingID}`);
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

      const newBooking = await BookingModel.create(bookingData);

      return res.redirect(`/payment/create/${newBooking.bookingID}`);
   } catch (error) {
      console.error(error);
      return res.send(error);
   }
};

module.exports = {
   createBooking,
};
