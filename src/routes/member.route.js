import { Router } from "express";

import {
  createMember,
  deleteMember,
  getMemberById,
  getMembers,
  updateMember,
} from "../controllers/member.controller.js";

import { createMemberValidation } from "../validators/member.validator.js";

import { validate } from "../middlewares/validate.middleware.js";

import { protect } from "../middlewares/auth.middleware.js";

import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();

router.get("/", protect, authorizeRoles("admin", "secretary"), getMembers);

router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "secretary"),
  getMemberById,
);

router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  createMemberValidation,
  validate,
  createMember,
);

router.patch("/:id", protect, authorizeRoles("admin"), updateMember);

router.delete("/:id", protect, authorizeRoles("admin"), deleteMember);

export default router;
