import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

import { User }
from "../models/user.model.js";
import { pool } from "../config/database.js";
import { env } from "../config/env.js";

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

  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + env.sessionHours * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO user_sessions (id,user_id,expires_at) VALUES ($1,$2,$3)`,
    [sessionId,user.id,expiresAt],
  );
  const token =
    jwt.sign(
      {
        userId:user.id,
        role:user.role,
        language:selectedLanguage,
        sid:sessionId
      },
      env.jwtSecret,
      {
        expiresIn: `${env.sessionHours}h`
      }
    );

  res.json({
    success:true,
    token,
    expiresAt,
    language:selectedLanguage
  });
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
