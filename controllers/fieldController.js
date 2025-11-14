const BookingModel = require("../models/Booking.js");
const FieldModel = require("../models/Field.js");
const { toMinutes, minutesToHHMM, formatDateYYYYMMDD, getTodayInWITA } = require("../utils/timeFormat.js");

const getHomePage = async (req, res, next) => {
   try {
      const fields = await FieldModel.find();

      if (fields.length === 0) {
         return res.render("field/home-page", { fields });
      }

      const todayLocal = new Date();
      todayLocal.setHours(0, 0, 0, 0);
      const queryDate = formatDateYYYYMMDD(todayLocal);

      return res.render("field/home-page", { fields, minutesToHHMM, queryDate });
   } catch (error) {
      console.log(error);
   }
};

const getAddField = (req, res) => {
   return res.render("field/add-field.ejs");
};

const postFieldCreation = async (req, res) => {
   try {
      console.log(req.body);
      const { name, price, openTime, closeTime } = req.body;

      const fieldData = {
         name,
         price,
         openTime: toMinutes(openTime),
         closeTime: toMinutes(closeTime),
      };

      const newField = new FieldModel(fieldData);
      await newField.save();

      req.flash("success", "Successfully adding a new field");
      return res.redirect("/fields");
   } catch (error) {
      return res.status(500).send(error);
   }
};

const getShowPage = async (req, res) => {
   const field = await FieldModel.findOne({ fieldID: req.params.fieldID }).populate({
      path: "reviews",
      populate: {
         path: "user",
      },
   });

   if (field) {
      const todayLocal = getTodayInWITA();

      let queryDateLocal;
      let year, month, day;

      if (req.query.date) {
         [year, month, day] = req.query.date.split("-").map(Number);
         queryDateLocal = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      } else {
         queryDateLocal = todayLocal;
         year = todayLocal.getUTCFullYear();
         month = todayLocal.getUTCMonth() + 1;
         day = todayLocal.getUTCDate();
      }

      const queryDateStr = formatDateYYYYMMDD(queryDateLocal);
      const minDate = formatDateYYYYMMDD(todayLocal);
      const maxDate = formatDateYYYYMMDD(new Date(todayLocal.getTime() + 1000 * 60 * 60 * 24 * 30));

      if (queryDateLocal.toISOString().slice(0, 10) > maxDate || queryDateLocal.toISOString().slice(0, 10) < minDate) {
         req.flash("error", `${queryDateLocal.toISOString().slice(0, 10)} is out of bound`);
         return res.redirect(`/fields/${req.params.fieldID}?date=${minDate}`);
      }

      const queryDateFormatted = queryDateLocal.toLocaleDateString("en-CA", {
         weekday: "long",
         year: "numeric",
         month: "long",
         day: "numeric",
         timeZone: "Asia/Singapore",
      });

      const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      // Date.UTC(year, monthIndex, day, hour, minute, second, millisecond), month dimulai dari index 0

      const booking = await BookingModel.find({
         field: field._id,
         date: { $gte: startOfDay, $lte: endOfDay },
         status: "success",
      });

      // time session (slot waktu)
      const timeSlots = new Set();
      for (let i = field.openTime; i + 60 <= field.closeTime; i += 60) {
         timeSlots.add(i);
      }

      const successBook = new Map(booking.flatMap((b) => b.slots.map((slot) => [slot, b.user.toString()])));

      return res.render("field/show-field.ejs", { field, minutesToHHMM, timeSlots, queryDateStr, queryDateFormatted, minDate, maxDate, successBook });
   }

   return res.status(404).send("Page not found!");
};

const getEditPage = async (req, res) => {
   const field = await FieldModel.findOne({ fieldID: req.params.fieldID });

   if (field) {
      return res.render("field/edit-field.ejs", { field, minutesToHHMM });
   }

   return res.status(404).send("Page not found!");
};

const putFieldEdit = async (req, res) => {
   try {
      const { name, price, openTime, closeTime } = req.body;

      const fieldData = {
         name,
         price,
         openTime: toMinutes(openTime),
         closeTime: toMinutes(closeTime),
      };

      await FieldModel.findOneAndUpdate({ fieldID: req.params.fieldID }, fieldData, { runValidators: true });

      req.flash("success", `Successfully edit a field`);
      return res.redirect(`/fields/${req.params.fieldID}`);
   } catch (error) {
      return res.status(500).send(error);
   }
};

const deleteField = async (req, res) => {
   try {
      await FieldModel.findOneAndDelete({ fieldID: req.params.fieldID });

      req.flash("success", `Successfully delete a field`);
      return res.redirect("/fields");
   } catch (error) {
      return res.status(500).send(error);
   }
};

module.exports = {
   getHomePage,
   getAddField,
   postFieldCreation,
   getShowPage,
   getEditPage,
   putFieldEdit,
   deleteField,
};
