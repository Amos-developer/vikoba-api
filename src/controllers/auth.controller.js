import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { User }
from "../models/user.model.js";

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
    password
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

  if (user.role !== "admin") {
    return res.status(403)
      .json({
        success:false,
        message:
        "Only admin users can login"
      });
  }

  const token =
    jwt.sign(
      {
        userId:user.id,
        role:user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn:
        process.env.JWT_EXPIRES_IN
      }
    );

  res.json({
    success:true,
    token
  });
};
