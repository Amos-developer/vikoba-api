import { Saving } from "../models/savings.model.js";

export const createSaving = async (req, res) => {
  try {
    const saving = await Saving.create(req.body);

    res.status(201).json({
      success: true,
      data: saving,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSavings = async (req, res) => {
  try {
    const savings = await Saving.getAll();

    res.status(200).json({
      success: true,
      data: savings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSavingById = async (req, res) => {
  try {
    const saving = await Saving.getById(req.params.id);

    if (!saving) {
      return res.status(404).json({
        success: false,
        message: "Saving record not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: saving,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateSaving = async (req, res) => {
  try {
    const saving = await Saving.updateById(req.params.id, req.body);

    if (!saving) {
      return res.status(404).json({
        success: false,
        message: "Saving record not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: saving,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteSaving = async (req, res) => {
  try {
    const saving = await Saving.deleteById(req.params.id);

    if (!saving) {
      return res.status(404).json({
        success: false,
        message: "Saving record not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: saving,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
