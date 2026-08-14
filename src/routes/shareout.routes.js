import { Router } from "express";
import { getShareouts, requestShareoutPayment } from "../controllers/shareout.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
const router=Router();
router.get('/',protect,authorizeRoles('chairperson','treasurer','secretary'),getShareouts);
router.post('/:id/request-payment',protect,authorizeRoles('treasurer'),requestShareoutPayment);
export default router;
