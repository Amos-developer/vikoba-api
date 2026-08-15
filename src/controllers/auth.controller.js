import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

import { User }
from "../models/user.model.js";
import { pool } from "../config/database.js";
import { env } from "../config/env.js";

const issueSession = async ({userId,role,organizationId,language},queryClient=pool) => {
  const sessionId=randomUUID();
  const expiresAt=new Date(Date.now()+env.sessionHours*60*60*1000);
  await queryClient.query(`INSERT INTO user_sessions (id,user_id,organization_id,expires_at) VALUES ($1,$2,$3,$4)`,[sessionId,userId,organizationId,expiresAt]);
  const token=jwt.sign({userId,role,organizationId,language,sid:sessionId},env.jwtSecret,{expiresIn:`${env.sessionHours}h`});
  return {token,expiresAt};
};

const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70);

// Register user
export const register =
async (req,res) => {

  const {
    name,
    email,
    password,
    role
  } = req.body;


  const existingUser =
    await User.findByEmail(email);

  if (existingUser) {
    return res.status(400)
      .json({
        success:false,
        message:
        "Email already exists"
      });
  }

  const hashedPassword =
    await bcrypt.hash(
      password,
      10
    );

  const user =
    await User.create({
      name,
      email,
      password:
      hashedPassword,
      role: role || "member"
    });

  await pool.query(`INSERT INTO organization_users(organization_id,user_id,role,is_billing_admin)
    VALUES($1,$2,$3,FALSE)`,[req.organization.id,user.id,role||"member"]);

  res.status(201).json({
    success:true,
    data:user
  });
};

// User login
export const login =
async (req,res) => {

  const {
    email,
    password,
    language,
    organization_slug,
  } = req.body;

  const user =
    await User.findByEmail(email);

  if (!user) {
    return res.status(401)
      .json({
        success:false,
        message:
        "Invalid credentials"
      });
  }

  if (user.is_active === false) {
    return res.status(403).json({
      success: false,
      message: "This account has been deactivated",
    });
  }

  const isMatch =
    await bcrypt.compare(
      password,
      user.password
    );

  if (!isMatch) {
    return res.status(401)
      .json({
        success:false,
        message:
        "Invalid credentials"
      });
  }

  const selectedLanguage = ["en", "sw"].includes(language) ? language : user.language || "en";
  if (selectedLanguage !== user.language) {
    await pool.query("UPDATE users SET language=$1 WHERE id=$2", [selectedLanguage, user.id]);
  }

  const membership = await pool.query(`SELECT ou.organization_id,ou.role,o.name,o.slug
    FROM organization_users ou JOIN organizations o ON o.id=ou.organization_id
    WHERE ou.user_id=$1 AND ou.is_active=TRUE AND o.is_active=TRUE AND ($2::text IS NULL OR o.slug=$2)
    ORDER BY ou.created_at LIMIT 1`,[user.id,organization_slug||null]);
  if(!membership.rowCount) return res.status(403).json({success:false,message:"No active group workspace is available for this account"});
  const group=membership.rows[0];
  const session=await issueSession({userId:user.id,role:group.role==="owner"?"admin":group.role,organizationId:group.organization_id,language:selectedLanguage});

  res.json({
    success:true,
    ...session,
    language:selectedLanguage,
    organization:{id:group.organization_id,name:group.name,slug:group.slug}
  });
};

export const startTrial = async (req,res) => {
  const {group_name,name,email,password,phone,language="en"}=req.body;
  const normalizedEmail=email?.trim().toLowerCase()||"";
  if(!group_name?.trim()||!name?.trim()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)||!password||password.length<8) {
    return res.status(400).json({success:false,message:"Group name, administrator name, valid email, and an 8-character password are required"});
  }
  const normalizedPhone=phone?.replace(/\s+/g,"")||null;
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const claimed=await client.query("SELECT 1 FROM trial_claims WHERE normalized_email=$1 OR ($2::text IS NOT NULL AND normalized_phone=$2)",[normalizedEmail,normalizedPhone]);
    if(claimed.rowCount) { await client.query("ROLLBACK"); return res.status(409).json({success:false,message:"A free trial has already been used with this email or phone"}); }
    const existing=await client.query("SELECT 1 FROM users WHERE email=$1",[normalizedEmail]);
    if(existing.rowCount) { await client.query("ROLLBACK"); return res.status(409).json({success:false,message:"Email already exists"}); }
    const slug=`${slugify(group_name)||"vikoba"}-${randomUUID().slice(0,8)}`;
    const organization=(await client.query(`INSERT INTO organizations(name,slug,billing_email,billing_phone)
      VALUES($1,$2,$3,$4) RETURNING *`,[group_name.trim(),slug,normalizedEmail,normalizedPhone])).rows[0];
    await client.query("SELECT set_config('app.organization_id',$1,true)",[String(organization.id)]);
    const hashedPassword=await bcrypt.hash(password,10);
    const user=(await client.query(`INSERT INTO users(name,email,password,role,language) VALUES($1,$2,$3,'admin',$4)
      RETURNING id,name,email,language`,[name.trim(),normalizedEmail,hashedPassword,language==="sw"?"sw":"en"])).rows[0];
    await client.query(`INSERT INTO organization_users(organization_id,user_id,role,is_billing_admin) VALUES($1,$2,'owner',TRUE)`,[organization.id,user.id]);
    const plan=(await client.query("SELECT id FROM plans WHERE code='professional_monthly' AND is_active=TRUE")).rows[0];
    await client.query(`INSERT INTO subscriptions(organization_id,plan_id,status,trial_started_at,trial_ends_at)
      VALUES($1,$2,'trialing',NOW(),NOW()+INTERVAL '7 days')`,[organization.id,plan.id]);
    await client.query(`INSERT INTO trial_claims(normalized_email,normalized_phone,organization_id) VALUES($1,$2,$3)`,[normalizedEmail,normalizedPhone,organization.id]);
    const session=await issueSession({userId:user.id,role:"admin",organizationId:organization.id,language:user.language},client);
    await client.query("COMMIT");
    return res.status(201).json({success:true,...session,language:user.language,organization:{id:organization.id,name:organization.name,slug:organization.slug}});
  } catch(error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
};

export const updateLanguage = async (req,res) => {
  const { language } = req.body;
  if (!["en", "sw"].includes(language)) {
    return res.status(400).json({success:false,message:"Language must be English or Swahili"});
  }
  await pool.query("UPDATE users SET language=$1 WHERE id=$2",[language,req.user.userId]);
  return res.json({success:true,data:{language}});
};

export const logout = async (req,res) => {
  await pool.query("UPDATE user_sessions SET revoked_at=NOW() WHERE id=$1 AND user_id=$2",[req.user.sid,req.user.userId]);
  res.json({success:true,message:"Session ended"});
};
