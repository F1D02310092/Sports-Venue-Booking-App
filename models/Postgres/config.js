const { Pool } = require("pg");

class PostgresDB {
   constructor() {
      this.pool = new Pool({
         connectionString: process.env.PG_CONNECTION_STRING,
         ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
         max: 20,
         idleTimeoutMillis: 30000,
         connectionTimeoutMillis: 5000,
      });

      this.pool.on("error", (err) => {
         console.error("Unexpected error on idle PostgreSQL client", err);
      });

      // Test connection
      this.testConnection();
   }

   async testConnection() {
      try {
         await this.pool.query("SELECT 1");
         console.log("PostgreSQL connected successfully");
      } catch (error) {
         console.error("PostgreSQL connection failed:", error.message);
      }
   }

   async query(text, params) {
      try {
         const result = await this.pool.query(text, params);
         return result;
      } catch (error) {
         console.error("PostgreSQL Query Error:", {
            query: text,
            params: params,
            error: error.message,
            code: error.code,
         });
         throw error;
      }
   }

   async transaction(callback) {
      const client = await this.pool.connect();
      try {
         await client.query("BEGIN");
         const result = await callback(client);
         await client.query("COMMIT");
         return result;
      } catch (error) {
         await client.query("ROLLBACK");
         console.error("Transaction failed:", error.message);
         throw error;
      } finally {
         client.release();
      }
   }

   async getClient() {
      return await this.pool.connect();
   }

   async close() {
      await this.pool.end();
   }
}

const db = new PostgresDB();
module.exports = db;
