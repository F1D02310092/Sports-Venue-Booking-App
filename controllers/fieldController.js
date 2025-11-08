const FieldModel = require("../models/Field.js");
const { toMinutes, minutesToHHMM } = require("../utils/timeFormat.js");

const getHomePage = async (req, res, next) => {
   try {
      const fields = await FieldModel.find();

      if (!fields && fields.length === 0) {
         return res.render("field/home-page", { fields });
      }

      return res.render("field/home-page", { fields, minutesToHHMM });
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
   const field = await FieldModel.findOne({ fieldID: req.params.fieldID });

   if (field) {
      // time session (slot waktu)
      const timeSlots = [];
      for (let i = field.openTime; i + 60 <= field.closeTime; i += 60) {
         timeSlots.push(i);
      }

      return res.render("field/show-field.ejs", { field, minutesToHHMM, timeSlots });
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
