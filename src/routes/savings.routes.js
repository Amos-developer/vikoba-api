import { Router } from "express";

import {
  createSaving,
  deleteSaving,
  getSavingById,
  getSavings,
  updateSaving,
} from "../controllers/savings.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();

router.get("/", protect, authorizeRoles("treasurer", "secretary"), getSavings);
router.get("/:id", protect, authorizeRoles("treasurer", "secretary"), getSavingById);
router.post("/", protect, authorizeRoles("treasurer"), createSaving);
router.patch("/:id", protect, authorizeRoles("treasurer"), updateSaving);
router.delete("/:id", protect, authorizeRoles("treasurer"), deleteSaving);

export default router;


