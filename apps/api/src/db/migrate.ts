import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool, query } from "./connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  console.log("[Migrate] Starting database migration...");

  try {
    // Create migrations tracking table
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get executed migrations
    const result = await query<{ version: string }>("SELECT version FROM schema_migrations ORDER BY version");
    const executed = new Set(result.rows.map((row) => row.version));

    // Get migration files
    const migrationsDir = join(__dirname, "../../migrations");
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const version = file.replace(".sql", "");

      if (executed.has(version)) {
        console.log(`[Migrate] Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`[Migrate] Executing ${file}...`);

      const sql = readFileSync(join(migrationsDir, file), "utf-8");
      await query(sql);

      await query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);

      console.log(`[Migrate] Completed ${file}`);
    }

    console.log("[Migrate] Migration completed successfully!");
  } catch (error) {
    console.error("[Migrate] Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
