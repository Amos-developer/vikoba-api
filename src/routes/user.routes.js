import { Router } from "express";
import { createUser, getUsers, updateUser } from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();
router.use(protect, authorizeRoles("admin"));
router.get("/", getUsers);
router.post("/", createUser);
router.patch("/:id", updateUser);
export default router;


