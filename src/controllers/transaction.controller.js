import { Transaction } from "../models/transaction.model.js";

export const createTransaction = async (req, res) => {
  try {
    const {
      member_id,
      amount,
      type,
      description
    } = req.body;

    const transaction =
      await Transaction.create({
        member_id,
        amount,
        type,
        description
      });

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: transaction
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const transactions =
      await Transaction.findAll();

    res.json({
      success: true,
      data: transactions
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};