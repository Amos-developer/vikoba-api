import { Router } from "express";

import {
  createTransaction,
  getTransactions
} from "../controllers/transaction.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();

router.use(protect, authorizeRoles("admin", "treasurer"));

router.post(
  "/",
  createTransaction
);

router.get(
  "/",
  getTransactions
);

export default router;


