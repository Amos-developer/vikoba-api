import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const roles = new Set(["admin", "chairperson", "treasurer", "secretary", "member"]);

export const getUsers = asyncHandler(async (req, res) => {
  const result = await pool.query(
    "SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC",
  );
  res.json({ success: true, data: result.rows });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role = "member" } = req.body;
  if (!name?.trim() || !email?.trim() || !password || !roles.has(role)) {
    const error = new Error("Name, email, password, and valid role are required");
    error.statusCode = 400;
    throw error;
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1,$2,$3,$4) RETURNING id,name,email,role,is_active,created_at`,
    [name.trim(), email.trim().toLowerCase(), hashedPassword, role],
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

export const updateUser = asyncHandler(async (req, res) => {
  if (req.body.role && !roles.has(req.body.role)) {
    const error = new Error("Invalid user role"); error.statusCode = 400; throw error;
  }
  if (Number(req.params.id) === Number(req.user.userId) && req.body.is_active === false) {
    const error = new Error("You cannot deactivate your own account"); error.statusCode = 400; throw error;
  }
  const result = await pool.query(
    `UPDATE users SET role = COALESCE($2, role),
       is_active = COALESCE($3, is_active)
     WHERE id = $1 RETURNING id,name,email,role,is_active,created_at`,
    [req.params.id, req.body.role || null, req.body.is_active ?? null],
  );
  if (!result.rows[0]) {
    const error = new Error("User not found"); error.statusCode = 404; throw error;
  }
  res.json({ success: true, data: result.rows[0] });
});


