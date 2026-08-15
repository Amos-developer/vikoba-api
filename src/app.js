import express from "express";
import cors from "cors";

import { env } from "./config/env.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/error.middleware.js";
import apiRoutes from "./routes/index.js";
import { auditTrail } from "./middlewares/audit.middleware.js";

const app = express();

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(auditTrail);

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "VICOBA API is healthy",
  });
});

app.use("/api", apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

