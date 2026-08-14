import { Approval } from "../models/approval.model.js";
import { SocialFund } from "../models/socialFund.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getSocialFund = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await SocialFund.findAll() });
});

export const createSocialFundEntry = asyncHandler(async (req, res) => {
  const { entry_type, member_id, beneficiary_name, category, amount,
    description, reference } = req.body;
  if (!['contribution', 'disbursement'].includes(entry_type)
      || Number(amount) <= 0 || !description?.trim()) {
    const error = new Error("Valid entry type, positive amount, and description are required");
    error.statusCode = 400; throw error;
  }
  if (entry_type === 'contribution' && !member_id) {
    const error = new Error("Select the contributing member");
    error.statusCode = 400; throw error;
  }
  if (entry_type === 'disbursement') {
    if (!['sickness', 'funeral', 'emergency', 'other'].includes(category)
        || !beneficiary_name?.trim()) {
      const error = new Error("Support category and beneficiary are required");
      error.statusCode = 400; throw error;
    }
    const approval = await Approval.create({
      action_type: 'social_fund_disbursement',
      payload: { member_id: member_id || null, beneficiary_name: beneficiary_name.trim(),
        category, amount: Number(amount), description: description.trim(), reference },
      reason: `Social support for ${beneficiary_name.trim()}: ${description.trim()}`,
      requested_by: req.user.userId,
    });
    return res.status(202).json({ success: true,
      message: "Social-fund disbursement submitted for approval", data: approval });
  }
  const approval = await Approval.create({
    action_type: "social_fund_contribution",
    payload: { member_id, amount: Number(amount), description: description.trim(), reference },
    reason: `Transfer member savings to social fund: ${description.trim()}`,
    requested_by: req.user.userId,
  });
  res.status(202).json({
    success: true,
    message: "Social-fund contribution submitted for approval",
    data: approval,
  });
});
