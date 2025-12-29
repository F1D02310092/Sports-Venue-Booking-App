const sharp = require("sharp");
const FileType = require("file-type");

async function sanitizeImage(buffer) {
   const type = await FileType.fromBuffer(buffer);

   if (!type || !["image/png", "image/jpeg"].includes(type.mime)) {
      throw new Error("INVALID_IMAGE_TYPE");
   }

   return await sharp(buffer).rotate().resize(1200, 1200, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 75, chromaSubsampling: "4:2:0", mozjpeg: true }).toColourspace("srgb").toBuffer();
}

module.exports = { sanitizeImage };
