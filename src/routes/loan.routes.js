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

router.get("/", protect, authorizeRoles("chairperson", "treasurer"), getLoans);
router.get("/:id", protect, authorizeRoles("chairperson", "treasurer"), getLoanById);

router.post("/", protect, authorizeRoles("treasurer"), createLoan);
router.patch("/:id", protect, authorizeRoles("treasurer"), updateLoan);
router.delete("/:id", protect, authorizeRoles("treasurer"), deleteLoan);

router.patch(
  "/:id/approve",
  protect,
  authorizeRoles("chairperson", "treasurer"),
  approveLoan,
);

export default router;


