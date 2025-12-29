const mongoose = require("mongoose");
const BookingModel = require("../models/Postgres/Booking.js");
const FieldModel = require("../models/Mongo/Field.js");
const { parseLocalDateToUTC, formatDateYYYYMMDD } = require("../utils/timeFormat.js");
const db = require("../models/Postgres/config.js");

const createBooking = async (req, res) => {
   const client = await db.getClient();

   try {
      await client.query("BEGIN");

      const field = await FieldModel.findOne({
         fieldID: req.params.fieldID,
         isActive: true,
      });

      if (!field) {
         await client.query("ROLLBACK");
         req.flash("error", "Field not found!");
         return res.redirect(`/fields/${req.params.fieldID}`);
      }

      let { date, slots } = req.body;

      if (!date || !slots) {
         await client.query("ROLLBACK");
         req.flash("error", "Missing required data");
         return res.redirect(`/fields/${req.params.fieldID}`);
      }

      const numericSlots = (Array.isArray(slots) ? slots : String(slots).split(",")).map(Number).sort((a, b) => a - b);

      const today = formatDateYYYYMMDD(new Date());
      if (date === today) {
         const now = new Date();
         const currentMinutes = now.getHours() * 60 + now.getMinutes();

         if (numericSlots[0] <= currentMinutes) {
            await client.query("ROLLBACK");
            req.flash("error", "Some slot(s) have already passed");
            return res.redirect(`/fields/${req.params.fieldID}`);
         }
      }

      const now = new Date();
      const bookingData = {
         field: field.fieldID,
         user: req.user.user_id,
         date: new Date(date),
         slots: numericSlots,
         startTime: numericSlots[0],
         endTime: numericSlots[numericSlots.length - 1] + 60,
         totalPrice: field.price * numericSlots.length,
         expiredAt: new Date(now.getTime() + 10 * 60 * 1000), // 10 minutes
      };

      try {
         const result = await BookingModel.reserveSlot(bookingData, client);

         await client.query("COMMIT");

         // sync with mongo
         await FieldModel.findOneAndUpdate({ fieldID: field.fieldID }, { $push: { bookings: result.booking_id } }).catch((err) => console.error(err));

         req.flash("success", "Slot reserved! Complete payment within 10 minutes");
         return res.redirect(`/payment/create/${result.booking_id}`);
      } catch (error) {
         await client.query("ROLLBACK");

         let errorMessage = "Booking failed. Please try again";

         switch (error.code) {
            case "SLOT_BOOKED":
               errorMessage = "Slot was just booked by another user";
               break;

            case "USER_RESERVED":
               // User already has a reservation for these slots
               if (error.booking_id) {
                  req.flash("info", "You already reserved this slot");
                  return res.redirect(`/payment/create/${error.booking_id}`);
               }
               errorMessage = "You already reserved this slot";
               break;

            case "SLOT_RESERVED":
               errorMessage = "Slot is currently reserved by another user";
               break;

            default:
               console.error("Booking reservation error:", error);
               errorMessage = error.message || "Booking failed";
               break;
         }

         req.flash("error", errorMessage);

         return res.redirect(`/fields/${req.params.fieldID}`);
      }
   } catch (error) {
      await client.query("ROLLBACK");

      console.error("Booking error:", error);
      req.flash("error", "Booking failed. Please try again");
      return res.redirect(`/fields/${req.params.fieldID}`);
   } finally {
      if (client) {
         client.release();
      }
   }
};

module.exports = {
   createBooking,
};
