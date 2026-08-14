import { Meeting } from "../models/meeting.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const validate = (body) => {
  if (!body.meeting_date || !body.agenda?.trim()) {
    const error = new Error("Meeting date and agenda are required");
    error.statusCode = 400; throw error;
  }
  const memberIds = (body.attendance || []).map((item) => Number(item.member_id));
  if (new Set(memberIds).size !== memberIds.length) {
    const error = new Error("Each member can appear only once in attendance");
    error.statusCode = 400; throw error;
  }
};

export const getMeetings = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Meeting.findAll() });
});
export const createMeeting = asyncHandler(async (req, res) => {
  validate(req.body);
  const meeting = await Meeting.save({ ...req.body, created_by: req.user.userId });
  res.status(201).json({ success: true, data: meeting });
});
export const updateMeeting = asyncHandler(async (req, res) => {
  validate(req.body);
  const meeting = await Meeting.save(req.body, req.params.id);
  if (!meeting) throw Object.assign(new Error("Meeting not found"), { statusCode: 404 });
  res.json({ success: true, data: meeting });
});
export const deleteMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.deleteById(req.params.id);
  if (!meeting) throw Object.assign(new Error("Meeting not found"), { statusCode: 404 });
  res.json({ success: true, data: meeting });
});


