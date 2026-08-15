import jwt from "jsonwebtoken";
import { pool } from "../config/database.js";
import { env } from "../config/env.js";
import { runWithOrganization } from "../config/database.js";
import { enforceSubscription } from "./subscription.middleware.js";

export const protect = async (
  req,
  res,
  next
) => {

  const authHeader =
    req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith(
      "Bearer "
    )
  ) {
    return res.status(401)
      .json({
        success:false,
        message:
        "Not authorized"
      });
  }

  const token =
    authHeader.split(" ")[1];

  try {

    const decoded =
      jwt.verify(
        token,
        env.jwtSecret
      );

    if (!decoded.sid) throw new Error("Session identifier missing");
    const session = await pool.query(`SELECT s.id,u.id AS user_id,u.is_active,s.organization_id,o.name AS organization_name,o.slug,
      ou.role,ou.is_billing_admin,ou.is_active AS membership_active,o.is_active AS organization_active
      FROM user_sessions s JOIN users u ON u.id=s.user_id JOIN organizations o ON o.id=s.organization_id
      JOIN organization_users ou ON ou.user_id=u.id AND ou.organization_id=o.id
      WHERE s.id=$1 AND s.user_id=$2 AND s.organization_id=$3 AND s.revoked_at IS NULL AND s.expires_at>NOW()`,
    [decoded.sid,decoded.userId,decoded.organizationId]);
    if(!session.rowCount||session.rows[0].is_active===false||session.rows[0].membership_active===false||session.rows[0].organization_active===false) throw new Error("Session inactive");
    await pool.query("UPDATE user_sessions SET last_seen_at=NOW() WHERE id=$1",[decoded.sid]);
    const row=session.rows[0];
    req.user = {userId:row.user_id,role:row.role==="owner"?"admin":row.role,sid:decoded.sid};
    req.organization={id:row.organization_id,name:row.organization_name,slug:row.slug};
    req.organizationMembership={role:row.role,is_billing_admin:row.is_billing_admin};
    return runWithOrganization({organizationId:row.organization_id,userId:row.user_id},()=>enforceSubscription(req,res,next));

  } catch {

    return res.status(401)
      .json({
        success:false,
        message:
        "Session expired or invalid"
      });
  }
};
