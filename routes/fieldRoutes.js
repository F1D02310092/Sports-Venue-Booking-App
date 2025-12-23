const express = require("express");
const router = express.Router();
const { getHomePage, getAddField, postFieldCreation, getShowPage, getEditPage, putFieldEdit, deleteField, getDeactivatedFieldsPage } = require("../controllers/fieldController");
const { isAdmin, isLoggedIn, zodValidate } = require("../middleware");
const { cloudinary, upload } = require("../config/imageUpload.js");
const { fieldSchema } = require("../sanitization-validation/validate.js");

// base url: /fields/...
router.route("/").get(getHomePage).post(isLoggedIn, isAdmin, upload.array("images"), zodValidate(fieldSchema), postFieldCreation);

router.route("/add").get(isLoggedIn, isAdmin, getAddField);

router.route("/deactivated").get(isLoggedIn, isAdmin, getDeactivatedFieldsPage);

router.route("/:fieldID/edit").get(isLoggedIn, isAdmin, getEditPage);

router.route("/:fieldID").get(getShowPage).put(isLoggedIn, isAdmin, upload.array("images"), zodValidate(fieldSchema), putFieldEdit).delete(isLoggedIn, isAdmin, deleteField);

module.exports = router;
