import { Router }
from "express";

import {
  register,
  login,
  logout,
  updateLanguage
}
from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();

router.post(
  "/register",
  protect,
  authorizeRoles("admin"),
  register
);

router.post(
  "/login",
  login
);
router.post("/logout",protect,logout);
router.patch("/language",protect,updateLanguage);

export default router;
