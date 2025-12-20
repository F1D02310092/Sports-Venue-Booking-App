const BookingModel = require("../models/Postgres/Booking.js");
const snap = require("../config/midtrans.js");
const { minutesToHHMM } = require("../utils/timeFormat");
const db = require("../models/Postgres/config.js");
const FieldModel = require("../models/Mongo/Field.js");

const createPayment = async (req, res) => {
   try {
      const { bookingID } = req.body;

      const booking = await BookingModel.findOneAndPopulate({ booking_id: bookingID });

      if (!booking) {
         return res.status(404).json({ error: "Booking not found" });
      }

      if (req.user.user_id.toString() !== booking.user_id.toString()) {
         return res.status(403).json({ error: "Unauthorized request" });
      }

      if (booking.status !== "pending") {
         return res.status(400).json({ error: "Payment already processed" });
      }

      const now = new Date();
      if (booking.expired_at && new Date(booking.expired_at) < now) {
         const client = await db.getClient();
         try {
            await client.query("BEGIN");
            await BookingModel.updateStatus(bookingID, "failed", client);
            await client.query("COMMIT");
         } catch (error) {
            await client.query("ROLLBACK");
            throw error;
         } finally {
            client.release();
         }

         return res.status(400).json({ error: "Booking expired" });
      }

      // check slot yg expired
      if (new Date(booking.date).toDateString() === now.toDateString()) {
         const currentMinutes = now.getHours() * 60 + now.getMinutes();
         if (booking.slots[0] <= currentMinutes) {
            return res.status(400).json({ error: "Session(s) already passed" });
         }
      }

      const expiredAt = new Date(booking.expired_at);
      let timeBeforeExpire = Math.ceil((expiredAt - now) / 60000);

      const field = await FieldModel.findOne({ fieldID: booking.field_id });
      if (!field) {
         return res.status(404).json({ error: "Field not found" });
      }

      let parameter = {
         transaction_details: {
            order_id: booking.booking_id,
            gross_amount: booking.total_price,
         },
         credit_card: {
            secure: true,
         },
         customer_details: {
            first_name: booking.user.username,
            email: booking.user.email,
         },
         item_details: [
            {
               id: field.fieldID,
               price: field.price,
               quantity: booking.slots.length,
               name: `${field.name} - ${booking.slots.length} slot(s)`,
               category: "Sports Venue",
            },
         ],
         callbacks: {
            finish: `${process.env.BASE_URL}/payment/success?bookingID=${booking.booking_id}`,
            // error: `${process.env.BASE_URL}/payment/failed?bookingID=${booking.bookingID}`,
            // pending: `${process.env.BASE_URL}/payment/pending?bookingID=${booking.bookingID}`,
         },

         expiry: {
            unit: "minutes",
            duration: timeBeforeExpire,
         },
      };

      const transaction = await snap.createTransaction(parameter);

      const client = await db.getClient();
      try {
         await client.query("BEGIN");

         await client.query(
            `
            UPDATE bookings
            SET order_id = $1, payment_token = $2, transaction_id = $3
            WHERE booking_id = $4`,
            [parameter.transaction_details.order_id, transaction.token, transaction.transaction_id, booking.booking_id]
         );

         await client.query("COMMIT");
      } catch (error) {
         await client.query("ROLLBACK");
      } finally {
         client.release();
      }

      res.json({
         token: transaction.token,
         redirect_url: transaction.redirect_url,
         booking_id: booking.booking_id,
      });
   } catch (error) {
      console.error("Payment creation error:", error);
      res.status(500).json({
         error: "Payment creation failed",
         message: error.message,
      });
   }
};

const handlePaymentNotification = async (req, res) => {
   const client = await db.getClient();

   try {
      await client.query("BEGIN");

      const result = await BookingModel.processPayment(req.body, client);

      if (result.code === "ALREADY_SUCCESS") {
         await client.query("COMMIT");
         return res.status(200).send("OK");
      }

      await client.query("COMMIT");
      return res.status(200).send("OK");
   } catch (error) {
      await client.query("ROLLBACK");
      console.error("Payment notification error:", error);
      return res.status(200).send("ERROR");
   } finally {
      client.release();
   }
};

const paymentSuccess = async (req, res) => {
   try {
      const { bookingID } = req.query;

      console.log(req.query);

      const booking = await BookingModel.findOneAndPopulate({ booking_id: bookingID });

      if (!booking) {
         req.flash("error", "Booking not found");
         return res.redirect("/fields");
      }

      // Get field details
      const field = await FieldModel.findOne({ fieldID: booking.field_id });

      const formatDate = (date) => {
         return new Date(date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
         });
      };

      return res.render("payment/success", {
         booking,
         field,
         minutesToHHMM,
         formatDate,
      });
   } catch (error) {
      console.error(error);
      req.flash("error", "Failed to load payment success page");
      return res.redirect("/fields");
   }
};

const showPaymentPage = async (req, res) => {
   try {
      const { bookingID } = req.params;

      // Get booking data
      const booking = await BookingModel.findOneAndPopulate({ booking_id: bookingID });

      if (!booking) {
         req.flash("error", "Booking not found");
         return res.redirect("/fields");
      }

      // Check if booking belongs to user
      if (booking.user_id !== req.user.user_id) {
         req.flash("error", "Unauthorized access");
         return res.redirect("/fields");
      }

      const now = new Date();
      if (booking.expired_at && new Date(booking.expired_at) < now) {
         const client = await db.getClient();
         try {
            await client.query("BEGIN");
            await BookingModel.updateStatus(bookingID, "failed", client);
            await client.query("COMMIT");
         } catch (error) {
            await client.query("ROLLBACK");
            throw error;
         } finally {
            client.release();
         }

         req.flash("error", "Booking expired");
         return res.redirect("/fields");
      }
      const expiredAt = new Date(booking.expired_at);
      let timeBeforeExpire = Math.ceil((expiredAt - now) / 60000);

      if (timeBeforeExpire <= 0) {
         await BookingModel.updateStatus(bookingID, "failed", client);
         return res.status(400).json({ error: "Booking already expired" });
      }

      if (booking.date === now && booking.slots[0] < now.getHours() * 60) {
         return res.status(400).json({ error: "Session(s) already passed" });
      }

      const field = await FieldModel.findOne({ fieldID: booking.field_id });

      const formattedExpiredAt = booking.expired_at.toLocaleString("en-CA", {
         weekday: "long",
         year: "numeric",
         month: "long",
         day: "2-digit",
         hour: "2-digit",
         minute: "2-digit",
         second: "2-digit",
         hour12: false,
         timeZone: "Asia/Singapore",
      });

      // Render payment page dengan data booking dan clientKey
      return res.render("payment/create", {
         booking,
         field,
         clientKey: process.env.MIDTRANS_CLIENT_KEY,
         minutesToHHMM: require("../utils/timeFormat").minutesToHHMM,
         formattedExpiredAt,
      });
   } catch (error) {
      console.error("Show payment page error:", error);
      req.flash("error", "Failed to load payment page");
      return res.redirect("/fields");
   }
};

const getPaymentHistory = async (req, res) => {
   try {
      let user;
      if (req.user.role === "user") {
         user = req.user;
      }
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const statusFilter = req.query.status;

      let query = {};
      if (user) {
         query.user_id = user.user_id;
      }

      if (statusFilter && statusFilter !== "all") {
         query.status = statusFilter;
      }

      const bookings = await BookingModel.find(query);
      const totalBookings = await BookingModel.countDocuments(query);
      const totalPages = Math.ceil(totalBookings / limit);

      const paginatedBooks = bookings.slice((page - 1) * limit, page * limit);
      const filedIds = [...new Set(paginatedBooks.map((b) => b.field_id))];
      const fields = await FieldModel.find({ fieldID: { $in: filedIds } });
      const fieldMap = {};
      fields.forEach((el) => (fieldMap[el.fieldID] = el.name));

      return res.render("payment/transactions-history.ejs", {
         page,
         limit,
         bookings: paginatedBooks.map((b) => ({
            ...b,
            field_name: fieldMap[b.field_id] || "Unknown Field",
         })),
         totalBookings,
         totalPages,
         currentPage: page,
         statusFilter,
         minutesToHHMM,
         formattedDate: (date) =>
            date.toLocaleString("en-CA", {
               weekday: "long",
               year: "numeric",
               month: "long",
               day: "numeric",
               timeZone: "Asia/Singapore",
            }),
         formatPrice: (price) => price.toLocaleString("id-ID"),
      });
   } catch (error) {
      console.error(error);
      return res.status(500).send("Something went wrong");
   }
};

const cancelBooking = async (req, res) => {
   try {
      const booking = await BookingModel.findOne({ booking_id: req.params.bookingID });
      if (!booking) {
         return res.status(404).send("Not Found!");
      }

      booking.status = "failed";
      await booking.save();

      req.flash("success", "Your booking is cancelled");
      return res.redirect("/fields");
   } catch (error) {
      console.error(error);
      return res.send(error);
   }
};

const getPaymentDetails = async (req, res) => {
   const booking = await BookingModel.findOneAndPopulate({ booking_id: req.params.bookingID });

   if (!booking) {
      return res.status(404).send("Not Found!");
   }

   const field = await FieldModel.findOne({ fieldID: booking.field_id });

   console.log(booking);

   return res.render("payment/transactions-detail.ejs", {
      booking,
      field,
      minutesToHHMM,
      formattedDate: (date) =>
         date.toLocaleString("en-CA", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "Asia/Singapore",
         }),
      formatPrice: (price) => price.toLocaleString("id-ID"),
   });
};

module.exports = {
   createPayment,
   handlePaymentNotification,
   paymentSuccess,
   showPaymentPage,
   getPaymentHistory,
   cancelBooking,
   getPaymentDetails,
};
