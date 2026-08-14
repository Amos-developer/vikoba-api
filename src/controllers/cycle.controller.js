import { Cycle } from "../models/cycle.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getCycles = asyncHandler(async (_req, res) => res.json({ success: true, data: await Cycle.findAll() }));
export const createCycle = asyncHandler(async (req, res) => {
  const { name, start_date, end_date } = req.body;
  if (!name?.trim() || !start_date || !end_date || new Date(end_date) < new Date(start_date)) {
    throw Object.assign(new Error("Name and a valid start/end date range are required"), { statusCode: 400 });
  }
  const cycle = await Cycle.create({ name: name.trim(), start_date, end_date, created_by: req.user.userId });
  res.status(201).json({ success: true, data: cycle });
});
export const activateCycle = asyncHandler(async (req, res) => res.json({ success: true, data: await Cycle.activate(req.params.id) }));
export const closeCycle = asyncHandler(async (req, res) => res.json({ success: true, data: await Cycle.close(req.params.id, req.user.userId, req.body.notes) }));
