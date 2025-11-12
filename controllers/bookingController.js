const UserModel = require("../models/User.js");
const BookingModel = require("../models/Booking.js");
const FieldModel = require("../models/Field.js");
const { parseLocalDateToUTC, formatDateYYYYMMDD } = require("../utils/timeFormat.js");

const createBooking = async (req, res) => {
   // masih ada egde cases yang harus di-handle

   try {
      const field = await FieldModel.findOne({ fieldID: req.params.fieldID });
      if (!field) {
         return res.status(404).send("Page not found!");
      }

      let { date, slots } = req.body;
      const bookingDateUTC = parseLocalDateToUTC(date);

      if (!Array.isArray(slots)) {
         slots = [slots];
      }
      slots = slots.map(Number);

      const conflictBooking = await BookingModel.findOne({
         field: field._id,
         user: req.user._id,
         date: bookingDateUTC,
         slots: { $in: [slots] },
         status: "success",
      });

      if (conflictBooking) {
         req.flash("error", "Session(s) are already booked!");
         return res.redirect(`/fields/${req.params.fieldID}?date=${date}`);
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
            return res.redirect(`/fields/${req.params.fieldID}?date=${date}`);
         }
      }

      const bookingData = {
         field: field._id,
         user: req.user._id,
         date: new Date(date),
         slots: slots,
         startTime: slots[0],
         endTime: slots[slots.length - 1],
         totalPrice: field.price * slots.length,
         status: "pending",
      };

      const newBooking = await BookingModel.create(bookingData);
      console.log(newBooking);

      req.flash("success", "Successfully booked a session(s)!");
      return res.redirect(`/fields/${req.params.fieldID}?date=${date}`);
   } catch (error) {
      console.log(error);
      return res.send(error);
   }
};

module.exports = {
   createBooking,
};
