import { Shareout } from "../models/shareout.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const getShareouts=asyncHandler(async(_req,res)=>res.json({success:true,data:await Shareout.findAll()}));
export const requestShareoutPayment=asyncHandler(async(req,res)=>res.status(202).json({success:true,
  message:'Share-out payment submitted for approval',data:await Shareout.requestPayment(req.params.id,req.user.userId)}));
