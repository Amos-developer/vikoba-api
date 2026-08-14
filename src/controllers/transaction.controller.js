import { Transaction } from "../models/transaction.model.js";
import { Approval } from "../models/approval.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const movementTypes = new Set([
  "saving", "loan_disbursement", "repayment", "withdrawal",
  "fine", "social_fund", "expense",
]);
const inflowTypes = new Set(["saving", "repayment", "fine", "social_fund"]);

export const createTransaction = asyncHandler(async (req, res) => {
  const { member_id, amount, type, description, reference } = req.body;
  if (!movementTypes.has(type) || Number(amount) <= 0 || !description?.trim()) {
    const error = new Error("Valid movement type, positive amount, and description are required");
    error.statusCode = 400;
    throw error;
  }
  if (type !== "expense" && !member_id) {
    const error = new Error("A member is required for this movement type");
    error.statusCode = 400;
    throw error;
  }

  if (["withdrawal", "expense"].includes(type)) {
    const approval = await Approval.create({
      action_type: type,
      payload: { member_id, amount: Number(amount), description: description.trim(), reference },
      reason: req.body.approval_reason || description.trim(),
      requested_by: req.user.userId,
    });
    return res.status(202).json({
      success: true,
      message: `${type === "expense" ? "Expense" : "Withdrawal"} submitted for approval`,
      data: approval,
    });
  }

  const transaction = await Transaction.create({
    member_id,
    amount: Number(amount),
    type,
    direction: inflowTypes.has(type) ? "inflow" : "outflow",
    description: description.trim(),
    reference,
    recorded_by: req.user.userId,
  });
  res.status(201).json({ success: true, data: transaction });
});

export const getTransactions = asyncHandler(async (req, res) => {
  const transactions = await Transaction.findAll(req.query);
  res.json({ success: true, data: transactions });
});


