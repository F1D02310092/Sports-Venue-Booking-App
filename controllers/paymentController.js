const BookingModel = require("../models/Booking.js");
const snap = require("../config/midtrans.js");

const createPayment = async (req, res) => {
   try {
      const { bookingID } = req.body;

      const booking = await BookingModel.findOneAndPopulate({ bookingID });

      if (!booking) {
         req.flash("error", "Booking not found!");
         return res.redirect(`/fields/${booking.field.fieldID}`);
      }

      if (req.user._id.toString() !== booking.user._id.toString()) {
         req.flash("error", "401 unauthorized request");
         return res.redirect("/fields");
      }

      if (booking.status !== "pending") {
         req.flash("error", "Payment already processed");
         return res.redirect(`/fields/${booking.field.fieldID}`);
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
               name: `${booking.field.name.substring(0, 30)} - ${booking.slots.length} slot(s)`.substring(0, 50),
               category: "Sports Venue",
            },
         ],
         callbacks: {
            finish: `${process.env.BASE_URL}/payment/success?fieldID=${booking.field.fieldID}`,
            error: `${process.env.BASE_URL}/payment/failed?fieldID=${booking.field.fieldID}`,
            pending: `${process.env.BASE_URL}/payment/pending?fieldID=${booking.field.fieldID}`,
         },
         expiry: {
            unit: "minutes",
            duration: 10,
         },
      };

      const transaction = await snap.createTransaction(parameter);

      booking.orderID = parameter.transaction_details.order_id;
      booking.paymentToken = transaction.token;
      booking.transactionID = transaction.transaction_id;
      booking.redirectURL = transaction.redirect_url;

      await booking.save();

      res.json({
         token: transaction.token,
         redirect_url: transaction.redirect_url,
      });
   } catch (error) {
      console.error("Payment error: ", error);
      console.error("Error stack: ", error.stack);

      // Rollback jika gagal, mark booking sebagai failed
      try {
         await BookingModel.findOneAndUpdate(
            { bookingID },
            {
               status: "failed",
               cancellationReason: `Payment creation failed: ${error.message}`,
            }
         );
      } catch (rollbackError) {
         console.error("Rollback failed:", rollbackError);
      }

      res.status(500).json({ error: "Payment creation failed: " + error.message });
   }
};

const handlePaymentNotification = async (req, res) => {
   try {
      const notification = req.body;
      const orderId = notification.order_id;
      const transactionStatus = notification.transaction_status;
      const fraudStatus = notification.fraud_status;

      const booking = await BookingModel.findOneAndPopulate({ orderID: orderId });

      if (!booking) {
         return res.status(200).send("Notification received: No booking found!");
      }

      if (booking.status === "success") {
         return res.status(200).send("Notification received: Booking success");
      }

      // nanti tambah edge handle conflict

      let newStatus = booking.status;

      if (transactionStatus == "capture") {
         if (fraudStatus == "accept") {
            newStatus = "success";
         } else if (fraudStatus == "challenge") {
            newStatus = "pending";
         } else {
            newStatus = "failed";
         }
      } else if (transactionStatus == "settlement") {
         newStatus = "success";
      } else if (transactionStatus == "pending") {
         newStatus = "pending";
      } else if (transactionStatus == "cancel" || transactionStatus == "deny" || transactionStatus == "expire") {
         newStatus = "failed";
      }

      // Only update if status changed
      if (newStatus !== booking.status) {
         booking.status = newStatus;
         booking.paymentTime = new Date();
         await booking.save();

         // CANCEL OTHERS PENDING BOOKINGS jika payment success
         if (newStatus === "success") {
            await BookingModel.updateMany(
               {
                  field: booking.field._id,
                  date: booking.date,
                  slots: { $in: booking.slots },
                  status: "pending",
                  _id: { $ne: booking._id },
               },
               {
                  status: "failed",
                  isOverridden: true,
               }
            );
         }
      }

      console.log(`[Midtrans] Order ${orderId} | Transaction: ${transactionStatus} | Fraud: ${fraudStatus} | New status: ${newStatus}`);

      return res.status(200).send("Notification received: OK");
   } catch (error) {
      console.error("Payment notification error:", error);
      return res.status(200).send("Notification received: Payment error");
   }
};

const paymentSuccess = async (req, res) => {
   try {
      const { order_id } = req.query;

      const booking = await BookingModel.findOneAndPopulate({ orderId: order_id });

      if (!booking) {
         req.flash("error", "Booking not found");
         return res.redirect("/");
      }

      return res.render("payment/success", {
         booking,
         minutesToHHMM: require("../utils/timeFormat").minutesToHHMM,
      });
   } catch (error) {
      console.error(error);
      req.flash("error", "Failed to load payment success page");
      return res.redirect("/");
   }
};

const paymentPending = async (req, res) => {
   try {
      const { order_id } = req.query;

      const booking = await BookingModel.findOneAndPopulate({ orderId: order_id });

      if (!booking) {
         req.flash("error", "Booking not found");
         return res.redirect("/");
      }

      return res.render("payment/pending", { booking });
   } catch (error) {
      console.error(error);
      req.flash("error", "Failed to load payment page");
      return res.redirect("/");
   }
};

const paymentFailed = async (req, res) => {
   try {
      const { order_id } = req.query;

      const booking = await BookingModel.findOneAndPopulate({ orderId: order_id });

      if (!booking) {
         req.flash("error", "Booking not found");
         return res.redirect("/");
      }

      return res.render("payment/failed", { booking });
   } catch (error) {
      console.error(error);
      req.flash("error", "Failed to load payment page");
      return res.redirect("/");
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

      // Render payment page dengan data booking dan clientKey
      return res.render("payment/create", {
         booking,
         clientKey: process.env.MIDTRANS_CLIENT_KEY,
         minutesToHHMM: require("../utils/timeFormat").minutesToHHMM,
      });
   } catch (error) {
      console.error("Show payment page error:", error);
      req.flash("error", "Failed to load payment page");
      return res.redirect("/fields");
   }
};

module.exports = {
   createPayment,
   handlePaymentNotification,
   paymentSuccess,
   paymentPending,
   paymentFailed,
   showPaymentPage,
};
