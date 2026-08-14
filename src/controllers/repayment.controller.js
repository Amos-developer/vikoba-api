import { Repayment } from "../models/repayment.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getRepayments = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Repayment.findAll() });
});

export const createRepayment = asyncHandler(async (req, res) => {
  if (!req.body.loan_id || Number(req.body.amount) <= 0) {
    const error = new Error("Loan and positive repayment amount are required");
    error.statusCode = 400;
    throw error;
  }
  const repayment = await Repayment.create({
    ...req.body,
    recorded_by: req.user.userId,
  });
  res.status(201).json({ success: true, data: repayment });
});


