import { Router } from "express";

import {
  getDashboardStats,
  getRecentMembers,
  getRecentTransactions
} from "../controllers/dashboard.controller.js";

const router = Router();

// Dashboard stats
router.get("/stats", getDashboardStats);

// Recent members
router.get("/recent-members", getRecentMembers);

// Recent transactions
router.get("/recent-transactions", getRecentTransactions);

export default router;