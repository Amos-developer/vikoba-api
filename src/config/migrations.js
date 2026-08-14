import { readdir, readFile } from "node:fs/promises";

import { pool } from "./database.js";

const migrationsDirectory = new URL("../../database/init/", import.meta.url);

const baselineExistingSchema = async () => {
  const checks = [
    {
      filename: "001_create_schema.sql",
      query: `SELECT
        to_regclass('public.members') IS NOT NULL AND
        to_regclass('public.savings') IS NOT NULL AND
        to_regclass('public.loans') IS NOT NULL AND
        to_regclass('public.transactions') IS NOT NULL AS exists`,
    },
    {
      filename: "002_create_penalties.sql",
      query: "SELECT to_regclass('public.penalties') IS NOT NULL AS exists",
    },
  ];

  for (const check of checks) {
    const applied = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE filename = $1",
      [check.filename],
    );
    if (applied.rowCount > 0) continue;

    const result = await pool.query(check.query);
    if (result.rows[0]?.exists) {
      await pool.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
        [check.filename],
      );
      console.log(`Baselined existing database migration: ${check.filename}`);
    }
  }
};

export const runMigrations = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await baselineExistingSchema();

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


