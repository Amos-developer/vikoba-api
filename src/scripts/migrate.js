import { disconnectFromDatabase } from "../config/database.js";
import { runMigrations } from "../config/migrations.js";

try {
  await runMigrations();
  console.log("Database migrations completed");
} catch (error) {
  console.error("Database migration failed:", error);
  if (error.code === "42501") {
    console.error(
      "Run migrations with the PostgreSQL role that owns the existing tables, then restore the API credentials.",
    );
  }
  process.exitCode = 1;
} finally {
  await disconnectFromDatabase();
}


