import { Router } from "express";

import {
  createLoan,
  approveLoan,
} from "../controllers/loan.controller.js";

import {
  protect,
} from "../middlewares/auth.middleware.js";

import {
  authorizeRoles,
} from "../middlewares/role.middleware.js";

const router = Router();

router.post(
  "/",
  protect,
  createLoan
);

router.patch(
  "/:id/approve",
  protect,
  authorizeRoles(
    "admin",
    "treasurer"
  ),
  approveLoan
);

export default router;