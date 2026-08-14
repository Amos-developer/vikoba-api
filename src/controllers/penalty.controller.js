import { Penalty } from "../models/penalty.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const validatePenalty = (data) => {
  if (!data.member_id || Number(data.amount) <= 0 || !data.reason?.trim()) {
    const error = new Error("Member, positive amount, and reason are required");
    error.statusCode = 400;
    throw error;
  }
};

export const getPenalties = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Penalty.findAll() });
});

export const createPenalty = asyncHandler(async (req, res) => {
  validatePenalty(req.body);
  const penalty = await Penalty.create(req.body);
  res.status(201).json({ success: true, data: penalty });
});

export const updatePenalty = asyncHandler(async (req, res) => {
  const penalty = await Penalty.updateById(req.params.id, req.body);
  if (!penalty) {
    const error = new Error("Penalty not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ success: true, data: penalty });
});

export const deletePenalty = asyncHandler(async (req, res) => {
  const penalty = await Penalty.deleteById(req.params.id);
  if (!penalty) {
    const error = new Error("Penalty not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ success: true, data: penalty });
});


