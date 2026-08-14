import { Router } from "express";
import { createRepayment, getRepayments } from "../controllers/repayment.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();
router.use(protect, authorizeRoles("admin", "treasurer"));
router.get("/", getRepayments);
router.post("/", createRepayment);

export default router;


