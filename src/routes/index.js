import { Router } from "express";

import authRoutes from "./auth.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import loanRoutes from "./loan.routes.js";
import memberRoutes from "./member.route.js";
import penaltyRoutes from "./penalty.routes.js";
import savingsRoutes from "./savings.routes.js";
import transactionRoutes from "./transaction.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/loans", loanRoutes);
router.use("/members", memberRoutes);
router.use("/penalties", penaltyRoutes);
router.use("/savings", savingsRoutes);
router.use("/transactions", transactionRoutes);

export default router;


