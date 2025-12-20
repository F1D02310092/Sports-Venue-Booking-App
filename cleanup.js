const BookingModel = require("./models/Postgres/Booking.js");
const db = require("./models/Postgres/config.js");
const cron = require("node-cron");

const cleanupExpiredReservations = async () => {
   console.log("Starting cleanup of expired reservations...");

   const client = await db.getClient();
   try {
      await client.query("BEGIN");

      const expired = await BookingModel.cleanupExpiredReservations(client);

      if (expired.length > 0) {
         console.log(`Cleaned up ${expired.length} expired reservations`);

         // Log details for monitoring
         expired.forEach((booking) => {
            console.log(`  - Expired: ${booking.booking_id} (user: ${booking.user_id || "manual"})`);
         });
      } else {
         console.log("No expired reservations to clean up");
      }

      await client.query("COMMIT");
   } catch (error) {
      await client.query("ROLLBACK");
      console.error("Cleanup error:", error);
   } finally {
      client.release();
   }
};

// Run every minute
cron.schedule("* * * * *", cleanupExpiredReservations);

// Also run on startup
console.log("Scheduling cleanup job...");
setTimeout(cleanupExpiredReservations, 10000); // Run 10 seconds after startup

module.exports = {
   cleanupExpiredReservations,
   cron,
};
