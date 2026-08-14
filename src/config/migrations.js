import { readdir, readFile } from "node:fs/promises";

import { pool } from "./database.js";

const migrationsDirectory = new URL("../../database/init/", import.meta.url);

export const runMigrations = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const filenames = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  for (const filename of filenames) {
    const applied = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE filename = $1",
      [filename],
    );

    if (applied.rowCount > 0) continue;

    const sql = await readFile(new URL(filename, migrationsDirectory), "utf8");
    await pool.query(sql);
    await pool.query(
      "INSERT INTO schema_migrations (filename) VALUES ($1)",
      [filename],
    );
    console.log(`Applied database migration: ${filename}`);
  }
};


