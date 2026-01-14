import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool, query } from "./connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function seed() {
  console.log("[Seed] Starting database seeding...");

  try {
    const seedFile = join(__dirname, "../../migrations/002_seed_data.sql");
    const sql = readFileSync(seedFile, "utf-8");

    await query(sql);

    console.log("[Seed] Database seeded successfully!");
  } catch (error) {
    console.error("[Seed] Seeding failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
