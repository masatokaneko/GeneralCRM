import pg from "pg";

const { Pool } = pg;

// Database connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5433", 10),
  database: process.env.DB_NAME || "crm",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on("connect", () => {
  console.log("Database connection established");
});

pool.on("error", (err) => {
  console.error("Unexpected database error:", err);
});

// Database wrapper with query helper
export const db = {
  query: async (text: string, params?: unknown[]) => {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === "development") {
        console.log("Executed query", { text: text.substring(0, 100), duration, rows: result.rowCount });
      }
      return result;
    } catch (error) {
      console.error("Query error:", { text: text.substring(0, 100), error });
      throw error;
    }
  },

  getClient: async () => {
    const client = await pool.connect();
    const query = client.query.bind(client);
    const release = client.release.bind(client);

    // Override release to log
    client.release = () => {
      client.release = release;
      return release();
    };

    return client;
  },

  // Transaction helper
  transaction: async <T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Close pool
  end: async () => {
    await pool.end();
  },
};

export default db;
