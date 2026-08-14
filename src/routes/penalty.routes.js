import { Router } from "express";
import {
  createPenalty,
  deletePenalty,
  getPenalties,
  updatePenalty,
} from "../controllers/penalty.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();
router.use(protect, authorizeRoles("chairperson", "secretary"));
router.get("/", getPenalties);
router.post("/", createPenalty);
router.patch("/:id", updatePenalty);
router.delete("/:id", deletePenalty);

export default router;


