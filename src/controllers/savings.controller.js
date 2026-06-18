import { Saving }
from "../models/savings.model.js";

export const createSaving =
async (req,res)=>{

  const {
    member_id,
    amount
  } = req.body;

  const saving =
    await Saving.create(
      member_id,
      amount
    );

  res.status(201).json({
    success:true,
    data:saving
  });
};