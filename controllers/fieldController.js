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

      console.log("a");
      console.log(toMinutes(openTime));
      console.log(toMinutes(closeTime));
      console.log("b");

      const fieldData = {
         name,
         price,
         openTime: toMinutes(openTime),
         closeTime: toMinutes(closeTime),
      };

      console.log(fieldData);

      const newField = new FieldModel(fieldData);
      await newField.save();

      return res.redirect("/fields");
   } catch (error) {
      return res.send(error);
   }
};

const getShowPage = async (req, res) => {
   const field = await FieldModel.findOne({ publicID: req.params.publicID });

   if (field) {
      console.log(field);
      return res.render("field/show-field.ejs", { field, minutesToHHMM });
   }

   return res.status(404).send("Page not found!");
};

const getEditPage = async (req, res) => {
   const field = await FieldModel.findOne({ publicID: req.params.publicID });

   if (field) {
      return res.render("field/edit-field.ejs", { field });
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

      await FieldModel.findOneAndUpdate({ publicID: req.params.publicID }, fieldData, { runValidators: true });

      return res.redirect(`/fields/${req.params.publicID}`);
   } catch (error) {
      return res.status(500).send(error);
   }
};

const deleteField = async (req, res) => {
   try {
      console.log("aaaaaaaaaaa");
      await FieldModel.findOneAndDelete({ publicID: req.params.publicID });
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
