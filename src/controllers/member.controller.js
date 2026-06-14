import { Member } from "../models/member.model.js";

// Create a new member
export const createMember =
  async (req, res) => {
    try {
      const member =
        await Member.create(req.body);

      res.status(201).json({
        success: true,
        data: member,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

//   Get all members
export const getMembers =
  async (req, res) => {
    try {
      const members =
        await Member.findAll();

      res.json({
        success: true,
        data: members,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

//   Get a member by ID
export const getMemberById =
  async (req, res) => {
    try {
      const member =
        await Member.findById(
          req.params.id
        );

      if (!member) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Member not found",
          });
      }

      res.json({
        success: true,
        data: member,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };