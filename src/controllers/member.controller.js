import { Member } from "../models/member.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Create member
export const createMember =
  asyncHandler(async (req, res) => {
    const member =
      await Member.create(req.body);

    res.status(201).json({
      success: true,
      data: member,
    });
  });

// Get all members
export const getMembers =
  asyncHandler(async (req, res) => {
    const members =
      await Member.findAll();

    res.status(200).json({
      success: true,
      data: members,
    });
  });

// Get member by ID
export const getMemberById =
  asyncHandler(async (req, res) => {
    const member =
      await Member.findById(
        req.params.id
      );

    if (!member) {
      const error = new Error(
        "Member not found"
      );
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: member,
    });
  });