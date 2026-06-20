import express from "express";
import cors from "cors";

import memberRoutes
  from "./routes/member.route.js";

  import {
  errorHandler,
} from "./middlewares/error.middleware.js";

import authRoutes
from "./routes/auth.routes.js";

import savingsRoutes from "./routes/savings.routes.js";  

import loanRoutes from "./routes/loan.routes.js";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.json({
    message: "Vicoba API Running",
  });
});

app.use(
  "/api/members",
  memberRoutes
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/savings",
  savingsRoutes
);

app.use(
  "/api/loans",
  loanRoutes
);

app.use(errorHandler);
export default app;