const BookingModel = require("../models/Postgres/Booking.js");
const db = require("../models/Postgres/config.js");
const FieldModel = require("../models/Mongo/Field.js");
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
   const client = await db.getClient();

   try {
      await client.query("BEGIN");

      let { date, slots, manualName, manualContact } = req.body;

      if (!date || !slots) {
         await client.query("ROLLBACK");
         req.flash("error", "Select at least one slot");
         return res.redirect(`/fields/${req.params.fieldID}`);
      }

      const field = await FieldModel.findOne({ fieldID: req.params.fieldID, isActive: true });

      if (!field) {
         await client.query("ROLLBACK");

         return res.status(404).send("Not found");
      }
      const numericSlots = (Array.isArray(slots) ? slots : String(slots).split(",")).map(Number).sort((a, b) => a - b);

      const dateOfToday = formatDateYYYYMMDD(new Date());
      if (date === dateOfToday) {
         const now = new Date();
         const minutes = now.getHours() * 60 + now.getMinutes();

         const invalidSlots = numericSlots.filter((el) => {
            return el <= minutes;
         });

         if (invalidSlots.length > 0) {
            await client.query("ROLLBACK");
            req.flash("error", "Session(s) already passed!");
            return res.redirect(`/admin/fields/${req.params.fieldID}?date=${date}`);
         }
      }

      const bookingData = {
         field: field.fieldID,
         manualName: manualName,
         manualContact: manualContact,
         date: new Date(date),
         slots: numericSlots,
         startTime: numericSlots[0],
         endTime: numericSlots[numericSlots.length - 1] + 60,
         totalPrice: field.price * numericSlots.length,
         status: "success",
         paymentTime: new Date(),
      };

      try {
         const newBooking = await BookingModel.createManualBooking(bookingData, client);

         // sycn dgn mongo
         await FieldModel.findOneAndUpdate({ fieldID: newBooking.fieldID }, { $push: { bookings: newBooking.booking_id } }).catch((err) => console.error(err));

         await client.query("COMMIT");

         req.flash("success", "Manual booking created successfully");
         return res.redirect(`/admin/fields/${req.params.fieldID}`);
      } catch (error) {
         await client.query("ROLLBACK");

         switch (error.code) {
            case "SLOT_BOOKED":
               req.flash("error", "Slot is already booked");
               break;

            case "LOCKED_RESERVATION":
               req.flash("error", "Slot is currently being processed. Please try again");
               break;

            default:
               console.error("Manual booking error:", error);
               req.flash("error", error.message || "Failed to create manual booking");
         }

         return res.redirect(`/admin/fields/${req.params.fieldID}`);
      }
   } catch (error) {
      await client.query("ROLLBACK");
   } finally {
      client.release();
   }
};

module.exports = {
   getManualBookForm,
   createManualBooking,
};
