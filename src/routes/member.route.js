import { Router } from "express";

import {
  createMember,
  getMembers,
  getMemberById,
} from "../controllers/member.controller.js";

const router = Router();

router.post(
  "/",
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