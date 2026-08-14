import app from "./app.js";
import { env } from "./config/env.js";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "./config/database.js";
import { runMigrations } from "./config/migrations.js";

const startServer = async () => {
  try {
    await connectToDatabase();
    await runMigrations();

    const server = app.listen(env.port, () => {
      console.log(`VICOBA API listening on port ${env.port}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        await disconnectFromDatabase();
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Unable to start the API:", error);
    process.exit(1);
  }
};

startServer();


