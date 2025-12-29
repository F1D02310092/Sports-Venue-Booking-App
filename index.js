if (process.env.NODE_ENV !== "production") {
   require("dotenv").config();
}

process.env.TZ = "Asia/Singapore";

const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const engine = require("ejs-mate");
const methodOverride = require("method-override");
const mongoStore = require("connect-mongo");
const flash = require("connect-flash");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const { globalLimiter } = require("./security/rateLimiter.js");
const UserModel = require("./models/Postgres/User.js");
const { csrfSynchronisedProtection, generateToken } = require("./security/csrfProtection.js");
const helmet = require("helmet");

const DB_URL = process.env.DB_URL || "mongodb://localhost:27017/futsal?replicaSet=rs0";
const main = async function () {
   try {
      await mongoose.connect(DB_URL);
      console.log("Connected to MongoDB!");
   } catch (err) {
      console.error("Connection error:", err);
   }
};
main();

app.use(
   helmet({
      contentSecurityPolicy: false, // Nonaktifkan CSP dulu agar tidak memblokir Cloudinary/Scripts
      crossOriginEmbedderPolicy: false,
   })
);

// setting view engine
app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// setting session & cookie
const store = mongoStore.create({
   mongoUrl: DB_URL,
   touchAfter: 3600 * 24,
   secret: process.env.SESSION_SECRET,
});

const sessionObject = {
   store,
   name: "qzaps25",
   secret: process.env.SESSION_SECRET,
   resave: false,
   saveUninitialized: false,
   rolling: true,
   cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
   },
};

app.use(session(sessionObject));
app.set("trust proxy", 1);
app.use(globalLimiter);

// setting passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(
   new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
         const result = await UserModel.authenticate(email, password);

         if (!result.success) {
            return done(null, false, { message: result.message });
         }

         return done(null, result.user);
      } catch (error) {
         return done(error);
      }
   })
);

passport.serializeUser((user, done) => {
   done(null, user.user_id);
});

passport.deserializeUser(async (id, done) => {
   try {
      const user = await UserModel.findByUserId(id);
      if (!user) {
         return done(new Error("User not found"), null);
      }
      done(null, user);
   } catch (err) {
      done(err, null);
   }
});

// setting flash
app.use(flash());
app.use((req, res, next) => {
   res.locals.currUser = req.user;

   res.locals.successFlashMsg = req.flash("success");
   res.locals.errorFlashMsg = req.flash("error");

   next();
});

// setting req.body parser for input form
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.json({ limit: "20kb" }));
app.use(methodOverride("_method"));

// pertimbangkan juga membatasi payload JSON

app.use((err, req, res, next) => {
   // Cek apakah error dari JSON parser
   if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
      console.error(err);
      return res.status(400).json("Invalid JSON format");
   }
   next();
});

// CSRF
// CSRF - GLOBAL VALIDATION
app.use((req, res, next) => {
   const excludedPaths = ["/payment/notification"];

   // Skip CSRF jika:
   // - GET / HEAD / OPTIONS
   // - static files
   // - webhook / excluded paths
   if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS" || req.path.match(/\.(css|js|jpg|png|gif|ico|svg)$/i) || excludedPaths.some((path) => req.path.startsWith(path))) {
      return next();
   }

   return csrfSynchronisedProtection(req, res, next);
});

// CSRF Token Generator Middleware (setelah protection)
// CSRF TOKEN GENERATOR (SETELAH validation middleware)
app.use((req, res, next) => {
   if (req.method === "GET" && req.headers.accept?.includes("text/html") && !req.path.match(/\.(css|js|jpg|png|gif|ico|svg)$/i)) {
      res.locals.csrfToken = generateToken(req);
   }
   next();
});

// serving static files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "assets")));

// admin routes
const adminRoutes = require("./routes/adminRoutes.js");
app.use("/admin", adminRoutes);

// auth routes
const authRoutes = require("./routes/authRoutes.js");
app.use("/", authRoutes);

// field routes
const fieldRoutes = require("./routes/fieldRoutes.js");
app.use("/fields", fieldRoutes);

// booking routes
const bookingRoutes = require("./routes/bookingRoutes.js");
app.use("/fields/:fieldID/users", bookingRoutes);

// payment routes
const paymentRoutes = require("./routes/paymentRoutes.js");
app.use("/payment", paymentRoutes);

// review routes
const reviewRoutes = require("./routes/reviewRoutes.js");
app.use("/fields/:fieldID/review", reviewRoutes);

// landing page
app.get("/", (req, res) => {
   return res.render("landing-page.ejs");
});

app.listen(3000, (req, res) => {
   console.log("Listening on port 3000");
});

require("./cleanup.js");
