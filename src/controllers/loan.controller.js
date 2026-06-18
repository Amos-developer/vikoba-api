import { Loan } from "../models/loan.model.js";
import { Transaction } from "../models/transaction.model.js";

export const createLoan = async (req, res) => {
  const { member_id, amount } = req.body;

  const loan = await Loan.create(
    member_id,
    amount
  );

  res.status(201).json({
    success: true,
    data: loan,
  });
};

export const approveLoan = async (req, res) => {
  const { id } = req.params;

  const loan = await Loan.approve(id);

  await Transaction.create(
    loan.member_id,
    "loan",
    loan.amount
  );

  res.json({
    success: true,
    data: loan,
  });
};