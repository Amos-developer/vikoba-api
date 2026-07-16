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

router.get("/", protect, authorizeRoles("admin"), getSavings);
router.get("/:id", protect, authorizeRoles("admin"), getSavingById);
router.post("/", protect, authorizeRoles("admin"), createSaving);
router.patch("/:id", protect, authorizeRoles("admin"), updateSaving);
router.delete("/:id", protect, authorizeRoles("admin"), deleteSaving);

export default router;
