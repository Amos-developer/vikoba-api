import { Router } from "express";

import {
  approveLoan,
  createLoan,
  deleteLoan,
  getLoanById,
  updateLoan,
} from "../controllers/loan.controller.js";
import { getLoans } from "../controllers/loan.fetch.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();

router.get("/", protect, authorizeRoles("admin"), getLoans);
router.get("/:id", protect, authorizeRoles("admin"), getLoanById);

router.post("/", protect, authorizeRoles("admin"), createLoan);
router.patch("/:id", protect, authorizeRoles("admin"), updateLoan);
router.delete("/:id", protect, authorizeRoles("admin"), deleteLoan);

router.patch(
  "/:id/approve",
  protect,
  authorizeRoles("admin", "treasurer"),
  approveLoan,
);

export default router;
