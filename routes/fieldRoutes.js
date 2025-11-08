const express = require("express");
const router = express.Router();
const { getHomePage, getAddField, postFieldCreation, getShowPage, getEditPage, putFieldEdit, deleteField } = require("../controllers/fieldController");
const { isAdmin, isLoggedIn } = require("../middleware");

// base url: /field/...
router.route("/").get(getHomePage).post(isLoggedIn, isAdmin, postFieldCreation);

router.route("/add").get(isLoggedIn, isAdmin, getAddField);

router.route("/:fieldID/edit").get(isLoggedIn, isAdmin, getEditPage);

router.route("/:fieldID").get(getShowPage).put(isLoggedIn, isAdmin, putFieldEdit).delete(isLoggedIn, isAdmin, deleteField);

module.exports = router;
