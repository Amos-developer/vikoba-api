import { Router } from "express";

import authRoutes from "./auth.routes.js";
import approvalRoutes from "./approval.routes.js";
import auditRoutes from "./audit.routes.js";
import cycleRoutes from "./cycle.routes.js";
import expenseRoutes from "./expense.routes.js";
import shareoutRoutes from "./shareout.routes.js";
import shareRoutes from "./share.routes.js";
import incomeRoutes from "./income.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import loanRoutes from "./loan.routes.js";
import memberRoutes from "./member.route.js";
import meetingRoutes from "./meeting.routes.js";
import penaltyRoutes from "./penalty.routes.js";
import repaymentRoutes from "./repayment.routes.js";
import reportRoutes from "./report.routes.js";
import savingsRoutes from "./savings.routes.js";
import socialFundRoutes from "./socialFund.routes.js";
import transactionRoutes from "./transaction.routes.js";
import userRoutes from "./user.routes.js";
import billingRoutes from "./billing.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/billing", billingRoutes);
router.use("/approvals", approvalRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/cycles", cycleRoutes);
router.use("/expenses", expenseRoutes);
router.use("/shareouts", shareoutRoutes);
router.use("/shares", shareRoutes);
router.use("/income", incomeRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/loans", loanRoutes);
router.use("/members", memberRoutes);
router.use("/meetings", meetingRoutes);
router.use("/penalties", penaltyRoutes);
router.use("/repayments", repaymentRoutes);
router.use("/reports", reportRoutes);
router.use("/savings", savingsRoutes);
router.use("/social-fund", socialFundRoutes);
router.use("/transactions", transactionRoutes);
router.use("/users", userRoutes);

export default router;
