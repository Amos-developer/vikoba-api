import express from "express";

import memberRoutes
  from "./routes/member.route.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Vicoba API Running",
  });
});

app.use(
  "/api/members",
  memberRoutes
);

export default app;