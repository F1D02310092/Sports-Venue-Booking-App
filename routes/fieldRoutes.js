const express = require("express");
const router = express.Router();
const { getHomePage, getAddField, postFieldCreation, getShowPage, getEditPage, putFieldEdit, deleteField } = require("../controllers/fieldController");

// base url: /field/...
router.route("/").get(getHomePage).post(postFieldCreation);

router.route("/add").get(getAddField);

router.route("/:publicID/edit").get(getEditPage);

router.route("/:publicID").get(getShowPage).put(putFieldEdit).delete(deleteField);

module.exports = router;
