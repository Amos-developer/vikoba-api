import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const roles = new Set(["admin", "chairperson", "treasurer", "secretary", "member"]);

export const getUsers = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT u.id,u.name,u.email,ou.role,u.language,ou.is_active,ou.is_billing_admin,ou.created_at
     FROM organization_users ou JOIN users u ON u.id=ou.user_id
     WHERE ou.organization_id=$1 ORDER BY ou.created_at DESC`,[req.organization.id],
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
  const hashedPassword = await bcrypt.hash(password, 10); const client=await pool.connect();
  try { await client.query("BEGIN");
    const result=await client.query(`INSERT INTO users (name,email,password,role) VALUES($1,$2,$3,$4)
      RETURNING id,name,email,language`,[name.trim(),email.trim().toLowerCase(),hashedPassword,role]);
    await client.query(`INSERT INTO organization_users(organization_id,user_id,role) VALUES($1,$2,$3)`,[req.organization.id,result.rows[0].id,role]);
    await client.query("COMMIT");res.status(201).json({success:true,data:{...result.rows[0],role,is_active:true}});
  } catch(error) { await client.query("ROLLBACK"); if(error.code==="23505"){error.statusCode=409;error.message="Email already exists";} throw error; }
  finally { client.release(); }
});

export const updateUser = asyncHandler(async (req, res) => {
  if (req.body.role && !roles.has(req.body.role)) {
    const error = new Error("Invalid user role"); error.statusCode = 400; throw error;
  }
  if (Number(req.params.id) === Number(req.user.userId) && req.body.is_active === false) {
    const error = new Error("You cannot deactivate your own account"); error.statusCode = 400; throw error;
  }
  const target=await pool.query("SELECT role FROM organization_users WHERE organization_id=$1 AND user_id=$2",[req.organization.id,req.params.id]);
  if(!target.rowCount){const error=new Error("User not found");error.statusCode=404;throw error;}
  if(target.rows[0].role==="owner"&&(req.body.role||req.body.is_active===false)){
    const error=new Error("The group owner cannot be demoted or deactivated");error.statusCode=400;throw error;
  }
  const result = await pool.query(`UPDATE organization_users SET role=COALESCE($3,role),is_active=COALESCE($4,is_active)
    WHERE organization_id=$1 AND user_id=$2 RETURNING user_id AS id,role,is_active,is_billing_admin,created_at`,
    [req.organization.id,req.params.id,req.body.role||null,req.body.is_active??null]);
  if (!result.rows[0]) {
    const error = new Error("User not found"); error.statusCode = 404; throw error;
  }
  res.json({ success: true, data: result.rows[0] });
});
