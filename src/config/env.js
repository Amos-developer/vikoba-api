import dotenv from "dotenv";

dotenv.config();

const requiredVariables = [
  "DB_HOST",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "JWT_SECRET",
];

const missingVariables = requiredVariables.filter(
  (variableName) => !process.env[variableName],
);

if (missingVariables.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVariables.join(", ")}`,
  );
}

const databasePort = Number(process.env.DB_PORT ?? 5432);
const appPort = Number(process.env.PORT ?? 3000);
const sessionHours = Number(process.env.SESSION_HOURS ?? 8);

if (!Number.isInteger(databasePort) || !Number.isInteger(appPort)
    || !Number.isFinite(sessionHours) || sessionHours <= 0) {
  throw new Error("PORT, DB_PORT, and SESSION_HOURS must be valid positive numbers");
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: appPort,
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET,
  sessionHours,
  database: Object.freeze({
    host: process.env.DB_HOST,
    port: databasePort,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  }),
});

