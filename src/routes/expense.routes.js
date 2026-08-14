import { Router } from "express";
import { createExpense, getExpenses } from "../controllers/expense.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
const router=Router();
router.get("/",protect,authorizeRoles("chairperson","treasurer","secretary"),getExpenses);
router.post("/",protect,authorizeRoles("treasurer"),createExpense);
export default router;
