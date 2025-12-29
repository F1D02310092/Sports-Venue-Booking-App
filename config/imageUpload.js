const cloudinary = require("cloudinary").v2;
const multer = require("multer");

cloudinary.config({
   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
   api_key: process.env.CLOUDINARY_API_KEY,
   api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage({});

const fileFilter = (req, file, cb) => {
   const allowed = ["image/jpg", "image/jpeg", "image/png"];

   if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Invalid file type. Only JPG/JPEG/PNG allowed"), false);
   }

   cb(null, true);
};

const upload = multer({
   storage,
   limits: {
      fileSize: 5 * 1024 * 1024,
      files: 3,
   },
   fileFilter,
});

module.exports = { cloudinary, upload };
