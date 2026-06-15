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

export default router;