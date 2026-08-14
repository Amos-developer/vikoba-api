import { Router } from "express";
import { getApprovals, reviewApproval } from "../controllers/approval.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();
router.use(protect, authorizeRoles("chairperson", "treasurer", "secretary"));
router.get("/", getApprovals);
router.patch("/:id/review", authorizeRoles("chairperson", "treasurer"), reviewApproval);
export default router;


