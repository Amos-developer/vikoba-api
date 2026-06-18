import { Router } from "express";

import {
  createMember,
  getMembers,
  getMemberById,
} from "../controllers/member.controller.js";

import {
  createMemberValidation,
} from "../validators/member.validator.js";

import {
  validate,
} from "../middlewares/validate.middleware.js";

import {
  protect,
} from "../middlewares/auth.middleware.js";

import {
  authorizeRoles,
} from "../middlewares/role.middleware.js";

const router = Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin", "secretary"),
  getMembers
);

router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "secretary"),
  getMemberById
);

router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  createMemberValidation,
  validate,
  createMember
);

export default router;