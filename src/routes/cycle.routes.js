import { Router } from "express";
import { activateCycle, closeCycle, createCycle, getCycles } from "../controllers/cycle.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();
router.get("/", protect, authorizeRoles("chairperson", "treasurer", "secretary"), getCycles);
router.post("/", protect, authorizeRoles("chairperson", "treasurer"), createCycle);
router.patch("/:id/activate", protect, authorizeRoles("chairperson", "treasurer"), activateCycle);
router.patch("/:id/close", protect, authorizeRoles("chairperson", "treasurer"), closeCycle);
export default router;
