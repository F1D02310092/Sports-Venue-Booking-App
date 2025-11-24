const express = require("express");
const router = express.Router();
const { getHomePage, getAddField, postFieldCreation, getShowPage, getEditPage, putFieldEdit, deleteField, getDeactivatedFieldsPage } = require("../controllers/fieldController");
const { isAdmin, isLoggedIn } = require("../middleware");
const { cloudinary, upload } = require("../config/imageUpload.js");

// base url: /fields/...
router.route("/").get(getHomePage).post(isLoggedIn, isAdmin, upload.array("images"), postFieldCreation);

router.route("/add").get(isLoggedIn, isAdmin, getAddField);

router.route("/deactivated").get(isLoggedIn, isAdmin, getDeactivatedFieldsPage);

router.route("/:fieldID/edit").get(isLoggedIn, isAdmin, getEditPage);

router.route("/:fieldID").get(getShowPage).put(isLoggedIn, isAdmin, upload.array("images"), putFieldEdit).delete(isLoggedIn, isAdmin, deleteField);

module.exports = router;
