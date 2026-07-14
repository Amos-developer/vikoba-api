import { Loan } from "../models/loan.model.js";

export const getLoans = async (req, res) => {
  try {
    const loans = await Loan.getAll();

    return res.status(200).json({
      success: true,
      data: loans,
    });
  } catch (error) {
    console.error("GET LOANS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
