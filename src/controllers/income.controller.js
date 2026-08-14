import { Income } from '../models/income.model.js';import { asyncHandler } from '../utils/asyncHandler.js';
export const getIncome=asyncHandler(async(_req,res)=>res.json({success:true,data:await Income.report()}));
export const createIncome=asyncHandler(async(req,res)=>{const {category,amount,payer,description,reference,income_date}=req.body;
  if(!['service_charge','other'].includes(category)||Number(amount)<=0||!description?.trim()||!income_date)
    throw Object.assign(new Error('Category, positive amount, description, and income date are required'),{statusCode:400});
  res.status(202).json({success:true,message:'Income submitted for approval',data:await Income.create({category,amount:Number(amount),payer:payer?.trim(),description:description.trim(),reference:reference?.trim(),income_date,requested_by:req.user.userId})});});
