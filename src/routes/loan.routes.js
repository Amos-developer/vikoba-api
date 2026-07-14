import { Router } from "express";

import { approveLoan, createLoan } from "../controllers/loan.controller.js";
import { getLoans } from "../controllers/loan.fetch.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();

router.get("/", protect, getLoans);

router.post("/", protect, createLoan);

router.patch(
  "/:id/approve",
  protect,
  authorizeRoles("admin", "treasurer"),
  approveLoan,
);

export default router;
