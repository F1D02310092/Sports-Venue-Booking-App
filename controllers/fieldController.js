const { cloudinary } = require("../config/imageUpload.js");
const mongoose = require("mongoose");
const BookingModel = require("../models/Postgres/Booking.js");
const FieldModel = require("../models/Mongo/Field.js");
const { toMinutes, minutesToHHMM, formatDateYYYYMMDD } = require("../utils/timeFormat.js");

const getHomePage = async (req, res, next) => {
   try {
      const fields = await FieldModel.find({ isActive: true });

      if (fields.length === 0) {
         return res.render("field/home-page", { fields });
      }

      const todayLocal = new Date();
      todayLocal.setHours(0, 0, 0, 0);
      const queryDate = formatDateYYYYMMDD(todayLocal);

      return res.render("field/home-page", { fields, minutesToHHMM, queryDate });
   } catch (error) {
      console.error(error);
   }
};

const getAddField = (req, res) => {
   return res.render("field/add-field.ejs");
};

const postFieldCreation = async (req, res) => {
   try {
      const { name, price, openTime, closeTime } = req.body;

      const fieldData = {
         name,
         price,
         openTime: toMinutes(openTime),
         closeTime: toMinutes(closeTime),
      };

      const newField = new FieldModel(fieldData);

      if (req.files && req.files.length > 0) {
         const uploadedImgs = [];

         for (f of req.files) {
            const base64 = `data:${f.mimetype};base64,${f.buffer.toString("base64")}`;

            const result = await cloudinary.uploader.upload(base64, {
               folder: "Futsal",
               allowed_formats: ["jpg", "jpeg", "png"],
            });

            uploadedImgs.push({
               url: result.secure_url,
               filename: result.public_id,
            });
         }

         newField.images = uploadedImgs;
      }

      await newField.save();

      req.flash("success", "Successfully adding a new field");
      return res.redirect("/fields");
   } catch (error) {
      return res.status(500).send(error);
   }
};

const getShowPage = async (req, res) => {
   const field = await FieldModel.findOne({ fieldID: req.params.fieldID, isActive: true }).populate("reviews");

   if (field) {
      const todayLocal = new Date();

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
         if (req.user.role === "user") {
            return res.redirect(`/fields/${req.params.fieldID}?date=${minDate}`);
         } else {
            return res.redirect(`/admin/fields/${req.params.fieldID}?date=${minDate}`);
         }
      }

      const queryDateFormatted = queryDateLocal.toLocaleDateString("en-CA", {
         weekday: "long",
         year: "numeric",
         month: "long",
         day: "numeric",
         timeZone: "Asia/Singapore",
      });

      const booking = await BookingModel.find({
         field_id: field.fieldID,
         date: queryDateStr,
         status: ["success", "pending"],
      });

      // time session (slot waktu)
      const timeSlots = new Set();
      for (let i = field.openTime; i + 60 <= field.closeTime; i += 60) {
         timeSlots.add(i);
      }

      const successBook = new Map();

      for (const b of booking) {
         const bookedBy = b.user_id ? b.user_id : b.manual_name;
         const reservedTime = new Date(b.expired_at).getTime() - Date.now();

         for (const slot of b.slots) {
            successBook.set(slot, { bookedBy, status: b.status, reservedTime: Math.ceil(reservedTime / 1000 / 60) });
         }
      }

      if (!req.user || req.user.role === "user") {
         return res.render("field/show-field.ejs", { field, minutesToHHMM, timeSlots, queryDateStr, queryDateFormatted, minDate, maxDate, successBook });
      } else {
         return res.render("admin/admin-field-page.ejs", { field, minutesToHHMM, timeSlots, queryDateStr, queryDateFormatted, minDate, maxDate, successBook });
      }
   }

   return res.status(404).send("Page not found!");
};

const getEditPage = async (req, res) => {
   const field = await FieldModel.findOne({ fieldID: req.params.fieldID, isActive: true });

   if (field) {
      const minDate = formatDateYYYYMMDD(new Date());

      return res.render("field/edit-field.ejs", { field, minutesToHHMM, minDate });
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

      const field = await FieldModel.findOneAndUpdate({ fieldID: req.params.fieldID, isActive: true }, fieldData, { runValidators: true, new: true });

      if (req.files && req.files.length > 0) {
         const uploadedImgs = [];

         for (f of req.files) {
            const base64 = `data:${f.mimetype};base64,${f.buffer.toString("base64")}`;

            const result = await cloudinary.uploader.upload(base64, {
               folder: "Futsal",
               allowed_formats: ["jpg", "jpeg", "png"],
            });

            uploadedImgs.push({
               url: result.secure_url,
               filename: result.public_id,
            });
         }

         field.images.push(...uploadedImgs);
         await field.save();
      }

      if (req.body.deleteImages) {
         for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename);
         }
         await FieldModel.findOneAndUpdate({ fieldID: req.params.fieldID, isActive: true }, { $pull: { images: { filename: { $in: req.body.deleteImages } } } });
      }

      req.flash("success", `Successfully edit a field`);
      return res.redirect(`/fields/${req.params.fieldID}`);
   } catch (error) {
      if (req.files && req.files.length > 0) {
         for (const file of req.files) {
            try {
               await cloudinary.uploader.destroy(file.filename);
            } catch (deleteError) {
               console.error("Error deleting uploaded file:", deleteError);
            }
         }
      }
      console.error(error);
      return res.status(500).send(error);
   }
};

const deleteField = async (req, res) => {
   try {
      const field = await FieldModel.findOneAndUpdate({ fieldID: req.params.fieldID }, { isActive: false }, { runValidators: true });

      if (field) {
         await BookingModel.findOneAndUpdate(
            {
               field: field._id,
               date: { $gte: new Date() },
               status: { $ne: "success" },
            },
            {
               status: "failed",
            }
         );
      }

      req.flash("success", `Successfully deactivate a field`);
      return res.redirect("/fields");
   } catch (error) {
      return res.status(500).send(error);
   }
};

const getDeactivatedFieldsPage = async (req, res) => {
   const fields = await FieldModel.find({ isActive: false });
   if (!fields) {
      return res.render("admin/deactivated-fields.ejs");
   }

   return res.render("admin/deactivated-fields.ejs", { fields, minutesToHHMM });
};

const reactivateField = async (req, res) => {
   const session = await mongoose.startSession();
   session.startTransaction();

   try {
      await FieldModel.findOneAndUpdate({ fieldID: req.params.fieldID }, { isActive: true }, { runValidators: true }).session(session);

      if (field) {
         await BookingModel.updateMany(
            {
               field: field._id,
               date: { $gte: new Date() },
               status: { $ne: "success" },
            },
            {
               status: "failed",
            },
            { session }
         );
      }

      await session.commitTransaction();
      await req.flash("success", "Field is now active");
      return res.redirect("/fields");
   } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      console.error(error);
      return res.status(500).send("Something went wrong");
   } finally {
      session.endSession();
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
   getDeactivatedFieldsPage,
   reactivateField,
};
