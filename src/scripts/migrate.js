import { disconnectFromDatabase } from "../config/database.js";
import { runMigrations } from "../config/migrations.js";

try {
  await runMigrations();
  console.log("Database migrations completed");
} catch (error) {
  console.error("Database migration failed:", error);
  process.exitCode = 1;
} finally {
  await disconnectFromDatabase();
}


