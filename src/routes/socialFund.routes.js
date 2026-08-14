import { Router } from "express";
import { createSocialFundEntry, getSocialFund } from "../controllers/socialFund.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();
router.get("/", protect, authorizeRoles("chairperson", "treasurer", "secretary"), getSocialFund);
router.post("/", protect, authorizeRoles("treasurer"), createSocialFundEntry);
export default router;
