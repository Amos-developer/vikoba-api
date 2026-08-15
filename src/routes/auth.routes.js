import { Router }
from "express";

import {
  register,
  login,
  logout,
  updateLanguage,
  startTrial
}
from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { rateLimit } from "../middlewares/rate-limit.middleware.js";

const router = Router();

router.post(
  "/register",
  protect,
  authorizeRoles("admin"),
  register
);

router.post(
  "/login",
  rateLimit({windowMs:15*60_000,max:10,keyPrefix:"login"}),
  login
);
router.post("/trial",rateLimit({windowMs:60*60_000,max:5,keyPrefix:"trial"}),startTrial);
router.post("/logout",protect,logout);
router.patch("/language",protect,updateLanguage);

export default router;
