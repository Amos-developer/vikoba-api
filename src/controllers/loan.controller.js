import { Loan } from "../models/loan.model.js";
import { Approval } from "../models/approval.model.js";

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
    const reason = req.body?.reason?.trim();

    const loan = await Loan.getById(id);

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    const approval = await Approval.create({
      action_type: "loan_disbursement",
      entity_id: loan.id,
      payload: { member_id: loan.member_id, amount: loan.amount },
      reason: reason || `Approve and disburse loan #${loan.id}`,
      requested_by: req.user.userId,
    });

    return res.status(202).json({
      success: true,
      message: "Loan approval request submitted",
      data: approval,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

