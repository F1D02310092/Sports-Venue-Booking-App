const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const db = require("./config");

class UserModel {
   static async create(userData) {
      const { username, email, password, role = "user" } = userData;

      if (!username || !email || !password) {
         throw new Error("Missing credentials");
      }

      if (password.lenght < 8 || /\s/.test(password)) {
         throw new Error(password.lenght < 8 ? "Password must be at least 8 characters" : "Password cannot contain any spaces");
      }

      const existingEmail = await this.findByEmail(email);
      if (existingEmail) {
         throw new Error("Email already registered"); // consider this as a leak of information
      }

      const hashedPass = await bcrypt.hash(password, 12);
      const userID = uuidv4();

      const query = `
            INSERT INTO users (user_id, username, email, password_hash, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, user_id, username, email, role, created_at
        `;

      try {
         const result = await db.query(query, [userID, username, email, hashedPass, role]);

         return result.rows[0];
      } catch (error) {
         if (error.code === "23505") {
            throw new Error("Email already registered");
         }

         throw error.message;
      }
   }

   static async findByEmail(email) {
      const query = `SELECT * FROM users WHERE email = $1`;
      const result = await db.query(query, [email]);

      return result.rows[0] || null;
   }

   static async findByUserId(userId) {
      const query = `SELECT * FROM users WHERE user_id = $1`;
      const result = await db.query(query, [userId]);

      return result.rows[0] || null;
   }

   static async findById(id) {
      const query = `SELECT * FROM users WHERE id = $1`;
      const result = await db.query(query, [id]);

      return result.rows[0] || null;
   }

   static async findOne(queryObj) {
      let whereClause = "";
      const conditions = [];
      const values = [];

      Object.keys(queryObj).forEach((key, idx) => {
         conditions.push(`${key} = $${idx + 1}`);
         values.push(queryObj[key]);
      });

      if (conditions.length > 0) {
         whereClause = "WHERE " + conditions.join(" AND ");
      }

      const query = `SELECT * FROM users ${whereClause} LIMIT 1`;
      const result = await db.query(query, values);

      return result.rows[0] || null;
   }

   static async isLocked(user) {
      return user.lock_until && user.lock_until > Date.now();
   }

   static async update(userID, updateData) {
      const setClause = [];
      const values = [];
      let index = 1;

      Object.keys(updateData).forEach((key) => {
         if (key !== "user_id" && key !== "id") {
            setClause.push(`${key} = $${index}`);
            values.push(updateData[key]);
            index++;
         }
      });

      setClause.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(userID);

      try {
         const query = `UPDATE users SET ${setClause} WHERE user_id = $${index} RETURNING *`;
         const result = await db.query(query, values);

         return result.rows[0];
      } catch (error) {
         throw new Error("Failed to update user data: ", error.message);
      }
   }

   // utk passport
   static async authenticate(email, password) {
      const user = await this.findByEmail(email);
      if (!user) {
         return { success: false, message: "Invalid email or password" };
      }

      if (this.isLocked(user)) {
         return { success: false, message: "Account locked, try again later" };
      }

      const isValid = await bcrypt.compare(password, password_hash);
      if (!isValid) {
         const loginAttempts = (user.login_attempts || 0) + 1;

         if (loginAttempts >= 5) {
            const lockUntil = new Date(Date.now() + 1000 * 60 * 15);

            await this.update(user.user_id, {
               login_attempts: loginAttempts,
               lock_until: lockUntil,
            });
         }

         return { success: false, message: loginAttempts >= 5 ? "Too many attempts, account locked for 15 minutes" : "Invalid email or password" };
      }

      // authenticate = reset login_attempts dan lock_until
      await this.update(user.user_id, {
         login_attempts: 0,
         lock_until: null,
      });

      return { success: true, user };
   }

   static async changePassword(userID, currentPassword, newPassword) {
      const user = await this.findByUserId(userID);
      if (!user) {
         throw new Error("User doesnt exits");
      }

      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) {
         throw new Error("Password mismatch");
      }

      const hashedPass = await bcrypt.hash(newPassword, 12);
      await this.update(user.user_id, { password_hash: hashedPass });

      return true;
   }
}

module.exports = UserModel;
