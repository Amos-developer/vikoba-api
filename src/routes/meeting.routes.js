import { Router } from "express";
import { createMeeting, deleteMeeting, getMeetings, updateMeeting } from "../controllers/meeting.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();
router.get("/", protect, getMeetings);
router.post("/", protect, authorizeRoles("chairperson", "secretary"), createMeeting);
router.patch("/:id", protect, authorizeRoles("chairperson", "secretary"), updateMeeting);
router.delete("/:id", protect, authorizeRoles("chairperson", "secretary"), deleteMeeting);
export default router;


