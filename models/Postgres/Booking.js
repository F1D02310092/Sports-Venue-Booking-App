const { v4: uuidv4 } = require("uuid");
const db = require("./config.js");

class BookingModel {
   // OPTIMISTIC LOCKING untuk pembuatan booking
   static async reserveSlot(bookingData, client) {
      const { field, user, date, slots, startTime, endTime, totalPrice, expiredAt } = bookingData;

      const bookingId = uuidv4();

      // atomic insert
      const insertQuery = `
            INSERT INTO bookings (
                booking_id, user_id, field_id, date, slots, start_time, 
                end_time, total_price, status, expired_at, order_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)
            ON CONFLICT (field_id, date, slots) 
            WHERE status IN ('success', 'pending')
            DO NOTHING
            RETURNING *
        `;

      const values = [bookingId, user, field, new Date(date), slots, startTime, endTime, totalPrice, expiredAt ? new Date(expiredAt) : null, bookingId];

      const insertResult = await client.query(insertQuery, values);

      if (insertResult.rows.length === 0) {
         const checkQuery = `
         SELECT status, user_id FROM bookings
         WHERE field_id = $1 AND date = $2 AND slots && $3 AND status IN ('pending', 'success')`;

         const checkResult = await client.query(checkQuery, [field, date, slots]);

         if (checkResult.rows[0].status === "success") {
            throw {
               code: "SLOT_BOOKED",
               message: "Some slot(s) is already booked by another user.",
            };
         } else if (checkResult.rows[0].user_id === user) {
            throw {
               code: "USER_RESERVED",
               message: "You've already reserved, please finish payment process.",
            };
         } else if (checkResult.rows[0].status === "pending") {
            throw {
               code: "SLOT_RESERVED",
               message: "Some slot(s) are currently reserved by another user.",
            };
         }

         throw { code: "UNKNOWN_ERROR", message: "Slot unavailable" };
      }

      return insertResult.rows[0];
   }

   // manual booking level admin = "mengambil paksa" slot, sehingga PESSIMISTIC LOCK
   static async createManualBooking(bookingData, client) {
      const { field, manualName, manualContact, date, slots, startTime, endTime, totalPrice } = bookingData;

      const bookingId = uuidv4();

      const checkPendingQuery = `
      SELECT 1 FROM bookings
      WHERE field_id = $1 AND date = $2 AND slots && $3 AND status = 'pending'
      FOR UPDATE NOWAIT`;
      // FOR UPDATE = lock semua baris dari hasil select
      // NOWAIT = throw error ketika barus suda ter-lock oleh transaction lain
      // oleh karena itu, harus di-handle dengan try-catch block
      try {
         const pendingResult = await client.query(checkPendingQuery, [field, date, slots]);

         if (pendingResult.rows.length > 0) {
            throw {
               code: "SLOT_RESERVED",
               message: "Some slot(s) are currently reserved by another user.",
            };
         }
      } catch (error) {
         if (error.code === "55P03") {
            // Lock not available (udh di-lock transaction lain)
            throw {
               code: "LOCKED_RESERVATION",
               message: "Slot reservation is currently being processed",
            };
         }
         throw error;
      }

      const checkSuccessQuery = `
      SELECT 1 FROM bookings
      WHERE field_id = $1 AND date = $2 AND slots && $3 AND status = 'success'
      FOR UPDATE NOWAIT`;

      try {
         const successResult = await client.query(checkSuccessQuery, [field, date, slots]);

         if (successResult.rows.length > 0) {
            throw {
               code: "SLOT_BOOKED",
               message: "Some slot(s) already booked",
            };
         }
      } catch (error) {
         if (error.code === "55P03") {
            // Lock not available (udh di-lock transaction lain)
            throw {
               code: "LOCKED_RESERVATION",
               message: "Slot reservation is currently being processed",
            };
         }
         throw error;
      }

      const insertQuery = `
            INSERT INTO bookings (
                booking_id, field_id, date, slots, start_time, 
                end_time, total_price, status, manual_name, manual_contact,
                payment_time, order_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'success', $8, $9, NOW(), $10)
            RETURNING *
        `;

      const result = await client.query(insertQuery, [bookingId, field, new Date(date), slots, startTime, endTime, totalPrice, manualName, manualContact, bookingId]);

      return result.rows[0];
   }

   // handle midtrans webhook notification
   static async processPayment(notification, client) {
      const { order_id, transaction_id, transaction_status, fraud_status } = notification;

      // lock baris (bukan slots)
      const lockQuery = `
      SELECT * FROM bookings
      WHERE order_id = $1
      FOR UPDATE`;

      const lockResult = await client.query(lockQuery, [order_id]);

      if (lockResult.rows.length === 0) {
         throw { code: "NOT_FOUND", message: "Booking not found" };
      }

      if (lockResult.rows[0].status === "success") {
         return {
            code: "ALREADY_SUCCESS",
            message: "Payment already processed",
            booking: lockResult.rows[0],
         };
      }

      const newStatus = this._getPaymentStatus(transaction_status, fraud_status);

      if (newStatus === "success") {
         await client.query(
            `UPDATE bookings SET status = 'success', payment_time = NOW(), transaction_id = $2
         WHERE booking_id = $1`,
            [lockResult.rows[0].booking_id, transaction_id]
         );
      } else {
         await client.query(
            `UPDATE bookings SET status = $1, transaction_id = COALESCE($2, transaction_id)
         WHERE booking_id = $3`,
            [newStatus, transaction_id, lockResult.rows[0].booking_id]
         );
      }

      return {
         code: "PROCESSED",
         message: "Payment processed",
         booking: { ...lockResult.rows[0], status: newStatus },
      };
   }

   static _getPaymentStatus(transactionStatus, fraudStatus) {
      if (transactionStatus === "settlement") {
         return "success";
      } else if (transactionStatus === "capture") {
         return fraudStatus === "accept" ? "success" : fraudStatus === "challenge" ? "pending" : "failed";
      } else if (transactionStatus === "pending") {
         return "pending";
      } else if (["cancel", "deny", "expire"].includes(transactionStatus)) {
         return "failed";
      }
      return "pending";
   }

   // query methods
   static async findOne(queryObj) {
      let whereClause = "";
      const conditions = [];
      const values = [];

      Object.keys(queryObj).forEach((key, index) => {
         if (Array.isArray(queryObj[key])) {
            conditions.push(`${key} = ANY($${index + 1})`);
            values.push(queryObj[key]);
         } else {
            conditions.push(`${key} = $${index + 1}`);
            values.push(queryObj[key]);
         }
      });

      if (conditions.length > 0) {
         whereClause = "WHERE " + conditions.join(" AND ");
      }

      const query = `SELECT * FROM bookings ${whereClause} LIMIT 1`;
      const result = await db.query(query, values);

      // return sebuah object BUKAN row object
      return result.rows[0] || null;
   }

   static async findOneAndPopulate(queryObj) {
      const booking = await this.findOne(queryObj); // return sebuah object BUKAN row object

      if (!booking) {
         throw { code: "NOT_FOUND", message: "Booking not found" };
      }

      if (booking.user_id) {
         const populateUserQuery = `
         SELECT user_id, email, username FROM users
         WHERE user_id = $1`;
         const result = await db.query(populateUserQuery, [booking.user_id]);
         booking.user = result.rows[0];
      } else {
         // utk manual booking
         booking.user = null;
      }

      return booking || null;
   }

   static async find(queryObj) {
      let whereClause = "";
      const conditions = [];
      const values = [];

      Object.keys(queryObj).forEach((key, index) => {
         if (Array.isArray(queryObj[key])) {
            conditions.push(`${key} = ANY($${index + 1})`);
            values.push(queryObj[key]);
         } else {
            conditions.push(`${key} = $${index + 1}`);
            values.push(queryObj[key]);
         }
      });

      if (conditions.length > 0) {
         whereClause = "WHERE " + conditions.join(" AND ");
      }

      const query = `SELECT * FROM bookings ${whereClause} ORDER BY created_at DESC`;
      const result = await db.query(query, values);

      // return sebuah object BUKAN row object
      return result.rows;
   }

   static async updateStatus(bookingId, status, client = null) {
      const query = `
            UPDATE bookings 
            SET status = $1, updated_at = NOW()
            WHERE booking_id = $2
            RETURNING *
        `;

      if (client) {
         const result = await client.query(query, [status, bookingId]);
         return result.rows[0];
      } else {
         const result = await db.query(query, [status, bookingId]);
         return result.rows[0];
      }
   }

   static async countDocuments(queryObj) {
      let whereClause = "";
      const conditions = [];
      const values = [];

      Object.keys(queryObj).forEach((key, index) => {
         conditions.push(`${key} = $${index + 1}`);
         values.push(queryObj[key]);
      });

      if (conditions.length > 0) {
         whereClause = "WHERE " + conditions.join(" AND ");
      }

      const query = `SELECT COUNT(*) FROM bookings ${whereClause}`;
      const result = await db.query(query, values);

      // return sebuah object BUKAN row object
      return parseInt(result.rows[0].count);
   }

   static async cleanupExpiredReservations(client) {
      const query = `
            WITH expired_reservations AS (
                SELECT booking_id, user_id, field_id, date, slots
                FROM bookings 
                WHERE status = 'pending' 
                AND expired_at < NOW()
                FOR UPDATE SKIP LOCKED
                LIMIT 100
            )
            UPDATE bookings 
            SET status = 'failed',
                updated_at = NOW()
            WHERE booking_id IN (SELECT booking_id FROM expired_reservations)
            RETURNING *
        `;

      const result = await client.query(query);
      return result.rows;
   }

   static async getAnalytics(startDate, endDate, fieldFilter) {
      // Logic Filter Field
      // Jika filter 'all', kita abaikan field_id di WHERE clause
      const fieldIdParam = fieldFilter === "all" ? null : fieldFilter;

      const query = `
         WITH matched_bookings AS (
            -- 1. Filter data mentah sesuai tanggal dan status
            SELECT total_price, field_id, payment_time
            FROM bookings
            WHERE status = 'success'
            AND payment_time >= $1 
            AND payment_time <= $2
            AND ($3::text IS NULL OR field_id = $3)
         ),
         
         revenue_stats AS (
            -- 2. Equivalent: facet 'revenue'
            SELECT 
               NULL as _id,
               COALESCE(SUM(total_price), 0) as "totalRevenue",
               COUNT(*) as "totalBookings"
            FROM matched_bookings
         ),

         court_stats AS (
            -- 3. Equivalent: facet 'revenueByCourt'
            -- Kita group by field_id dulu (karena name ada di Mongo)
            SELECT 
               field_id as "fieldID",
               COALESCE(SUM(total_price), 0) as revenue,
               COUNT(*) as bookings
            FROM matched_bookings
            GROUP BY field_id
            ORDER BY revenue DESC
         ),

         date_stats AS (
            -- 4. Equivalent: facet 'revenueByDate'
            SELECT 
               TO_CHAR(payment_time, 'YYYY-MM-DD') as _id,
               COALESCE(SUM(total_price), 0) as revenue,
               COUNT(*) as bookings
            FROM matched_bookings
            GROUP BY 1
            ORDER BY revenue DESC
         )

         -- 5. Construct JSON output agar strukturnya SAMA PERSIS dengan output $facet Mongo
         SELECT json_build_object(
            'revenue', (SELECT COALESCE(json_agg(row_to_json(revenue_stats)), '[]'::json) FROM revenue_stats),
            'revenueByCourt', (SELECT COALESCE(json_agg(row_to_json(court_stats)), '[]'::json) FROM court_stats),
            'revenueByDate', (SELECT COALESCE(json_agg(row_to_json(date_stats)), '[]'::json) FROM date_stats)
         ) as result;
      `;

      const values = [startDate, endDate, fieldIdParam];
      const result = await db.query(query, values);

      // Mengembalikan object analytics langsung
      return result.rows[0].result;
   }

   static async findWithUser(queryObj) {
      let whereClause = "";
      const conditions = [];
      const values = [];

      Object.keys(queryObj).forEach((key, index) => {
         conditions.push(`b.${key} = $${index + 1}`);
         values.push(queryObj[key]);
      });

      if (conditions.length > 0) {
         whereClause = "WHERE " + conditions.join(" AND ");
      }

      const query = `
      SELECT 
         b.*,
         u.user_id AS u_user_id,
         u.email AS u_email,
         u.username AS u_username
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.user_id
      ${whereClause}
      ORDER BY b.created_at DESC
   `;

      const result = await db.query(query, values);

      return result.rows.map((row) => ({
         ...row,
      }));
   }
}

module.exports = BookingModel;
