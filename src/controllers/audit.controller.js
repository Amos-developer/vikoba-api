import { Audit } from '../models/audit.model.js';import { asyncHandler } from '../utils/asyncHandler.js';
export const getAuditLogs=asyncHandler(async(req,res)=>res.json({success:true,data:await Audit.findAll(req.query)}));
