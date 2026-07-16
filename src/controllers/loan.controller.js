import { Loan } from "../models/loan.model.js";
import { Transaction } from "../models/transaction.model.js";

export const createLoan = async (req, res) => {
  try {
    const loan = await Loan.create(req.body);

    res.status(201).json({
      success: true,
      data: loan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getLoanById = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await Loan.getById(id);

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    return res.json({
      success: true,
      data: loan,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await Loan.updateById(id, req.body);

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    return res.json({
      success: true,
      data: loan,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await Loan.deleteById(id);

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    return res.json({
      success: true,
      data: loan,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const approveLoan = async (req, res) => {
  try {
    const { id } = req.params;

    const loan = await Loan.approve(id);

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    await Transaction.create(loan.member_id, "loan", loan.amount);

    return res.json({
      success: true,
      data: loan,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
