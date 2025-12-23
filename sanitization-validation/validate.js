const { z } = require("zod");
const { htmlSanitize } = require("./sanitize.js");

// AUTH DATA VALIDATOR
const registerSchema = z.object({
   body: z.object({
      username: z
         .string()
         .trim()
         .regex(/^[a-zA-Z0-9_]+$/),
      email: z.string().email(),
      password: z
         .string()
         .min(8)
         .regex(/^[A-Za-z0-9_]+$/),
   }),
});

const loginSchema = z.object({
   body: z.object({
      username: z.string().email(), // sesuai dgn strategy Passport (cek index.js)
      password: z
         .string()
         .min(8)
         .regex(/^[A-Za-z0-9_]+$/),
   }),
});

const updateProfileSchema = z.object({
   params: z.object({
      userID: z.string().uuidv4(),
   }),

   body: z
      .object({
         username: z
            .string()
            .trim()
            .regex(/^[a-zA-Z0-9_]+$/)
            .optional(),
         password: z
            .string()
            .min(8)
            .regex(/^[A-Za-z0-9_]+$/)
            .optional(),
         newPassword: z
            .string()
            .min(8)
            .regex(/^[A-Za-z0-9_]+$/)
            .optional(),
      })
      .refine((data) => {
         if (data.newPassword && !data.password) {
            return false;
         }

         return true;
      }),
});

// BOOKING DATA VALIDATOR
const createBookingSchema = z.object({
   params: z.object({
      fieldID: z.string().uuidv4(),
   }),
   body: z.object({
      date: z.string().date(), // YYYY-MM-DD

      slots: z.preprocess((val) => {
         if (val === undefined) return [];

         if (Array.isArray(val)) return val;

         return [val];
      }, z.array(z.coerce.number()).min(1)),
   }),
});

const manualBookingSchema = createBookingSchema.extend({
   body: createBookingSchema.shape.body.extend({
      manualName: z
         .string()
         .trim()
         .transform((val) => htmlSanitize(val)), // Sanitized
      manualContact: z
         .string()
         .trim()
         .transform((val) => htmlSanitize(val)),
   }),
});

// FIELD DATA VALIDATOR
const fieldSchema = z.object({
   params: z.object({
      fieldID: z.string().uuidv4().optional(), // saat create field, bisa null
   }),

   body: z.object({
      name: z
         .string()
         .trim()
         .transform((val) => htmlSanitize(val)),
      price: z.coerce.number().min(0),
      openTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM"),
      closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM"),
      deleteImages: z.union([z.string(), z.array(z.string())]).optional(),
   }),
});

// REVIEW DATA VALIDATOR
const reviewSchema = z.object({
   params: z.object({
      fieldID: z.string().uuidv4(),
   }),

   body: z.object({
      text: z
         .string()
         .trim()
         .transform((val) => htmlSanitize(val)),
      rating: z.coerce.number().min(1).max(5),
   }),
});

module.exports = {
   registerSchema,
   loginSchema,
   updateProfileSchema,
   createBookingSchema,
   manualBookingSchema,
   fieldSchema,
   reviewSchema,
};
