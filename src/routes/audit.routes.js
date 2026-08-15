import { Router } from 'express';import { getAuditLogs } from '../controllers/audit.controller.js';import { protect } from '../middlewares/auth.middleware.js';import { authorizeRoles } from '../middlewares/role.middleware.js';
const router=Router();router.get('/',protect,authorizeRoles('chairperson','secretary'),getAuditLogs);export default router;
