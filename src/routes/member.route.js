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
  protect
}
from "../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/",
  createMemberValidation,
  validate,
  createMember
);

router.get(
  "/",
  getMembers
);

router.get(
  "/:id",
  getMemberById
);

router.get("/", protect, getMembers);

router.get("/:id", protect, getMemberById);

router.post("/", protect, createMember);

export default router;