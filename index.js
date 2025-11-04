const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const engine = require("ejs-mate");
const methodOverride = require("method-override");
const mongoStore = require("connect-mongo");
const flash = require("connect-flash");
const session = require("express-session");

const DB_URL = process.env.DB_URL || "mongodb://localhost:27017/futsal";
const main = async function () {
   try {
      await mongoose.connect(DB_URL);
      console.log("Connected to MongoDB!");
   } catch (err) {
      console.error("Connection error:", err);
   }
};
main();

// setting view engine
app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// setting req.body parser for input form
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

// serving static files
app.use(express.static(path.join(__dirname, "public")));

// field routes
const fieldRoutes = require("./routes/fieldRoutes.js");
app.use("/fields", fieldRoutes);

// landing page
app.get("/", (req, res) => {
   return res.render("landing-page.ejs");
});

app.listen(3000, (req, res) => {
   console.log("Listening on port 3000");
});
