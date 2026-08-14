import { Expense } from "../models/expense.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const categories = new Set(["stationery","mobile_money_charge","meeting_cost","registration_cost","bank_charge","transport","other"]);
export const getExpenses = asyncHandler(async (_req,res) => res.json({success:true,data:await Expense.findAll()}));
export const createExpense = asyncHandler(async (req,res) => {
  const {category,amount,payee,description,reference,expense_date}=req.body;
  if (!categories.has(category)||Number(amount)<=0||!description?.trim()||!expense_date) {
    throw Object.assign(new Error("Category, positive amount, description, and expense date are required"),{statusCode:400});
  }
  const expense=await Expense.create({category,amount:Number(amount),payee:payee?.trim(),
    description:description.trim(),reference:reference?.trim(),expense_date,requested_by:req.user.userId});
  res.status(202).json({success:true,message:"Expense submitted for approval",data:expense});
});
