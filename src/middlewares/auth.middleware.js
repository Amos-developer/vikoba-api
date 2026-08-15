import jwt from "jsonwebtoken";
import { pool } from "../config/database.js";
import { env } from "../config/env.js";

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
    const session = await pool.query(`SELECT s.id,u.id AS user_id,u.role,u.is_active
      FROM user_sessions s JOIN users u ON u.id=s.user_id
      WHERE s.id=$1 AND s.user_id=$2 AND s.revoked_at IS NULL AND s.expires_at>NOW()`,
    [decoded.sid,decoded.userId]);
    if(!session.rowCount||session.rows[0].is_active===false) throw new Error("Session inactive");
    await pool.query("UPDATE user_sessions SET last_seen_at=NOW() WHERE id=$1",[decoded.sid]);
    req.user = {userId:session.rows[0].user_id,role:session.rows[0].role,sid:decoded.sid};

    next();

  } catch {

    return res.status(401)
      .json({
        success:false,
        message:
        "Session expired or invalid"
      });
  }
};
