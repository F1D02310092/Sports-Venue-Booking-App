const BookingModel = require("../models/Booking.js");
const snap = require("../config/midtrans.js");
const { minutesToHHMM } = require("../utils/timeFormat");
const mongoose = require("mongoose");

const createPayment = async (req, res) => {
   try {
      const { bookingID } = req.body;

      const booking = await BookingModel.findOneAndPopulate({ bookingID });

      if (!booking) {
         return res.status(404).json({ error: "Booking not found" });
      }

      if (req.user._id.toString() !== booking.user._id.toString()) {
         return res.status(403).json({ error: "Unauthorized request" });
      }

      if (booking.status !== "pending") {
         return res.status(400).json({ error: "Payment already processed" });
      }

      const now = new Date();
      const expiredAt = new Date(booking.expiredAt);
      let timeBeforeExpire = Math.ceil((expiredAt - now) / 60000);

      // kalau udah lewat waktu, anggap expired
      if (timeBeforeExpire <= 0) {
         booking.status = "failed";
         await booking.save();
         return res.status(400).json({ error: "Booking already expired" });
      }

      if (booking.slots[0] < now.getHours() * 60) {
         return res.status(400).json({ error: "Session(s) already passed" });
      }

      // edge cases
      // block double book (debouncer on FE and idempotency key on BE)
      // bisa cek expired dgn tambahin expired di schema dan atur sesuai dgn payload midtrans
      // jika slot sudah diambil oleh success payment, maka semua booking lain yg ada slot ini harus di cancel

      let parameter = {
         transaction_details: {
            order_id: booking.bookingID,
            gross_amount: booking.totalPrice,
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
               id: booking.field.fieldID,
               price: booking.field.price,
               quantity: booking.slots.length,
               name: `${booking.field.name} - ${booking.slots.length} slot(s)`,
               category: "Sports Venue",
            },
         ],
         callbacks: {
            finish: `${process.env.BASE_URL}/payment/success?bookingID=${booking.bookingID}`,
            error: `${process.env.BASE_URL}/payment/failed?bookingID=${booking.bookingID}`,
            pending: `${process.env.BASE_URL}/payment/pending?bookingID=${booking.bookingID}`,
         },

         expiry: {
            unit: "minutes",
            duration: timeBeforeExpire,
         },
      };

      const transaction = await snap.createTransaction(parameter);

      booking.orderID = parameter.transaction_details.order_id;
      booking.paymentToken = transaction.token;
      booking.transactionID = transaction.transaction_id;

      await booking.save();

      res.json({
         token: transaction.token,
      });
   } catch (error) {
      console.error("Payment error: ", error);
      console.error("Error stack: ", error.stack);

      // Rollback jika gagal, mark booking sebagai failed
      try {
         await BookingModel.findOneAndUpdate(
            { bookingID: booking.bookingID },
            {
               status: "failed",
            }
         );
      } catch (rollbackError) {
         console.error("Rollback failed:", rollbackError);
      }

      res.status(500).json({ error: "Payment creation failed: " + error.message });
   }
};

const handlePaymentNotification = async (req, res) => {
   const session = await mongoose.startSession();
   session.startTransaction();

   try {
      const notification = req.body;
      const orderId = notification.order_id;
      const transactionID = notification.transaction_id;
      const transactionStatus = notification.transaction_status;
      const fraudStatus = notification.fraud_status;

      const booking = await BookingModel.findOneAndPopulate({ orderID: orderId }, { session });

      if (!booking) {
         await session.abortTransaction();
         return res.status(200).send("Notification received: No booking found!");
      }

      if (booking.status === "success") {
         await session.abortTransaction();

         return res.status(200).send("Notification received: Booking success");
      }

      if (!booking.transactionID && transactionID) {
         booking.transactionID = transactionID;
      }

      let targetStatus = booking.status; // default to current status

      if (transactionStatus === "settlement") {
         targetStatus = "success";
      } else if (transactionStatus === "capture") {
         if (fraudStatus === "accept") targetStatus = "success";
         else if (fraudStatus === "challenge") targetStatus = "pending";
         else targetStatus = "failed";
      } else if (transactionStatus === "pending") {
         targetStatus = "pending";
      } else if (["cancel", "deny", "expire"].includes(transactionStatus)) {
         targetStatus = "failed";
      }

      if (targetStatus === "success") {
         const conflict = await BookingModel.findOne(
            {
               field: booking.field,
               date: booking.date,
               slots: { $in: booking.slots },
               status: "success",
               _id: { $ne: booking._id },
            },
            { session } // CRITICAL
         );

         if (conflict) {
            // RACE CONDITION LOST : REFUND NEEDED
            booking.status = "failed";

            await booking.save({ session });
            await session.commitTransaction(); // COMMIT ROLLBACK STATE

            console.log(`Race Condition: Order ${orderId} failed, REFUND NEEDED`);
            return res.status(200).send("Conflict detected");
         }

         // WIN: Update to Success
         booking.status = "success";
         booking.paymentTime = new Date();
         await booking.save({ session });

         // Kill other pendings
         await BookingModel.updateMany(
            {
               field: booking.field,
               date: booking.date,
               slots: { $in: booking.slots },
               status: "pending",
               _id: { $ne: booking._id },
            },
            { status: "failed" },
            { session } // CRITICAL
         );
      } else if (targetStatus !== booking.status) {
         booking.status = targetStatus;
         booking.paymentTime = new Date();
         await booking.save({ session });
      }

      await session.commitTransaction();

      return res.status(200).send("Notification received: OK");
   } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      console.error("Payment notification error:", error);
      return res.status(200).send("Notification received: Payment error");
   } finally {
      session.endSession();
   }
};

const paymentSuccess = async (req, res) => {
   try {
      const { bookingID } = req.query;

      const booking = await BookingModel.findOneAndPopulate({ bookingID });

      if (!booking) {
         req.flash("error", "Booking not found");
         return res.redirect("/fields");
      }

      const formattedExpiredAt = booking.expiredAt.toLocaleString("en-CA", {
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

      return res.render("payment/success", {
         booking,
         minutesToHHMM: require("../utils/timeFormat").minutesToHHMM,
         formattedExpiredAt,
      });
   } catch (error) {
      console.error(error);
      req.flash("error", "Failed to load payment success page");
      return res.redirect("/fields");
   }
};

const paymentPending = async (req, res) => {
   try {
      const { bookingID } = req.query;

      const booking = await BookingModel.findOneAndPopulate({ bookingID });

      if (!booking) {
         req.flash("error", "Booking not found");
         return res.redirect("/fields");
      }

      return res.render("payment/pending", { booking });
   } catch (error) {
      console.error(error);
      req.flash("error", "Failed to load payment page");
      return res.redirect("/fields");
   }
};

const paymentFailed = async (req, res) => {
   try {
      const { bookingID } = req.query;

      const booking = await BookingModel.findOneAndPopulate({ bookingID });

      if (!booking) {
         req.flash("error", "Booking not found");
         return res.redirect("/fields");
      }

      const formattedExpiredAt = booking.expiredAt.toLocaleString("en-CA", {
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

      return res.render("payment/failed", { booking, minutesToHHMM: require("../utils/timeFormat").minutesToHHMM, formattedExpiredAt });
   } catch (error) {
      console.error(error);
      req.flash("error", "Failed to load payment page");
      return res.redirect("/fields");
   }
};

const showPaymentPage = async (req, res) => {
   try {
      const { bookingID } = req.params;

      // Get booking data
      const booking = await BookingModel.findOneAndPopulate({ bookingID });

      if (!booking) {
         req.flash("error", "Booking not found");
         return res.redirect("/fields");
      }

      // Check if booking belongs to user
      if (booking.user._id.toString() !== req.user._id.toString()) {
         req.flash("error", "Unauthorized access");
         return res.redirect("/fields");
      }

      const now = new Date();
      const expiredAt = new Date(booking.expiredAt);
      let timeBeforeExpire = Math.ceil((expiredAt - now) / 60000);

      if (timeBeforeExpire <= 0) {
         booking.status = "failed";
         await booking.save();
         return res.status(400).json({ error: "Booking already expired" });
      }

      if (booking.slots[0] < now.getHours() * 60) {
         return res.status(400).json({ error: "Session(s) already passed" });
      }

      const formattedExpiredAt = booking.expiredAt.toLocaleString("en-CA", {
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
         query = { user: user._id };
      }
      if (statusFilter && statusFilter !== "all") {
         query.status = statusFilter;
      }

      const bookings = await BookingModel.findAllByQuery(query)
         .populate("field")
         .sort({ createdAt: -1 })
         .skip((page - 1) * limit)
         .limit(limit);
      // mongo akan 'membangun' query-query untuk kemudian 'await' menutup query dan baru dieksekusi

      const totalBookings = await BookingModel.countDocuments(query);
      const totalPages = Math.ceil(totalBookings / limit);

      const now = new Date();
      const expiredBookings = bookings.filter((b) => b.expiredAt < now && b.status === "pending");
      if (expiredBookings.length > 0) {
         await BookingModel.updateMany(
            {
               _id: { $in: expiredBookings.map((b) => b._id) },
            },
            {
               status: "failed",
            }
         );
      }

      return res.render("payment/transactions-history.ejs", {
         page,
         limit,
         bookings,
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
      const booking = await BookingModel.findOne({ bookingID: req.params.bookingID });
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
   const booking = await BookingModel.findOneAndPopulate({ bookingID: req.params.bookingID });

   if (!booking) {
      return res.status(404).send("Not Found!");
   }

   return res.render("payment/transactions-detail.ejs", {
      booking,
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
   paymentPending,
   paymentFailed,
   showPaymentPage,
   getPaymentHistory,
   cancelBooking,
   getPaymentDetails,
};
