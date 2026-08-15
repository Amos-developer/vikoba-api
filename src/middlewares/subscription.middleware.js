import { pool } from "../config/database.js";

const writableStatuses = new Set(["trialing", "active", "grace_period"]);
const featureByPrefix = [
  ["/api/reports", "reports"],
  ["/api/approvals", "approvals"],
  ["/api/audit-logs", "audit_logs"],
];

const normalizeSubscription = async (subscription) => {
  const now = Date.now();
  let status = subscription.status;
  let graceEndsAt = subscription.grace_ends_at;
  if (status === "trialing" && new Date(subscription.trial_ends_at).getTime() <= now) status = "expired";
  if (status === "active" && subscription.current_period_ends_at
      && new Date(subscription.current_period_ends_at).getTime() <= now) {
    if (subscription.cancel_at_period_end) {
      status = "cancelled";
      graceEndsAt = null;
    } else {
      status = "grace_period";
      graceEndsAt = new Date(new Date(subscription.current_period_ends_at).getTime() + 3 * 86400000);
    }
  }
  if (status === "grace_period" && graceEndsAt && new Date(graceEndsAt).getTime() <= now) status = "expired";
  if (status !== subscription.status || String(graceEndsAt) !== String(subscription.grace_ends_at)) {
    await pool.query("UPDATE subscriptions SET status=$1,grace_ends_at=$2,updated_at=NOW() WHERE id=$3",[status,graceEndsAt,subscription.id]);
  }
  return { ...subscription, status, grace_ends_at: graceEndsAt };
};

export const enforceSubscription = async (req,res,next) => {
  try {
    const result = await pool.query(`SELECT s.*,p.code AS plan_code,p.name AS plan_name,p.member_limit,p.features,p.billing_interval,p.price_tzs
      FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.organization_id=$1`,[req.organization.id]);
    if (!result.rowCount) return res.status(403).json({success:false,code:"SUBSCRIPTION_REQUIRED",message:"This group does not have a subscription"});
    req.subscription = await normalizeSubscription(result.rows[0]);

    const feature = featureByPrefix.find(([prefix]) => req.originalUrl.startsWith(prefix))?.[1];
    if (feature && req.subscription.status !== "trialing" && req.subscription.features?.[feature] !== true) {
      return res.status(403).json({success:false,code:"FEATURE_NOT_INCLUDED",message:"This feature is not included in the current plan"});
    }

    const isWrite = !["GET","HEAD","OPTIONS"].includes(req.method);
    const billingSafePath = req.originalUrl.startsWith("/api/billing") || req.originalUrl.startsWith("/api/auth/logout") || req.originalUrl.startsWith("/api/auth/language");
    if (isWrite && !billingSafePath && !writableStatuses.has(req.subscription.status)) {
      return res.status(402).json({success:false,code:"SUBSCRIPTION_READ_ONLY",message:"The trial or subscription has expired. Existing records remain available, but changes require an active plan."});
    }

    if (req.method === "POST" && req.originalUrl.startsWith("/api/members") && req.subscription.member_limit) {
      const count = await pool.query("SELECT COUNT(*)::int AS count FROM members");
      if (count.rows[0].count >= req.subscription.member_limit) {
        return res.status(403).json({success:false,code:"MEMBER_LIMIT_REACHED",message:`The ${req.subscription.plan_name} plan allows up to ${req.subscription.member_limit} members`});
      }
    }
    return next();
  } catch (error) { return next(error); }
};

export const requireBillingAdmin = (req,res,next) => {
  if (req.organizationMembership.role === "owner" || req.organizationMembership.is_billing_admin) return next();
  return res.status(403).json({success:false,message:"Billing owner permission is required"});
};
