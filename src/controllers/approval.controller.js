import { Approval } from "../models/approval.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getApprovals = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Approval.findAll(req.query.status || null) });
});

export const reviewApproval = asyncHandler(async (req, res) => {
  if (!['approved', 'rejected'].includes(req.body.decision)) {
    const error = new Error("Decision must be approved or rejected");
    error.statusCode = 400;
    throw error;
  }
  const approval = await Approval.review(
    req.params.id, req.user.userId, req.body.decision, req.body.note,
  );
  res.json({ success: true, data: approval });
});


