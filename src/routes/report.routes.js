import { Router } from "express";
import { getReports } from "../controllers/report.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();
router.get("/", protect, authorizeRoles("admin", "treasurer", "secretary"), getReports);
export default router;


