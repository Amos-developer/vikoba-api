import { Report } from "../models/report.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getReports = asyncHandler(async (req, res) => {
  const memberId = req.query.member_id ? Number(req.query.member_id) : null;
  if (req.query.member_id && !Number.isInteger(memberId)) {
    const error = new Error("Member filter must be a valid member ID");
    error.statusCode = 400;
    throw error;
  }
  const report = await Report.generate({
    memberId,
    from: req.query.from || null,
    to: req.query.to || null,
  });
  res.json({ success: true, data: report });
});


