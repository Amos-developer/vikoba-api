import { pool } from "../config/database.js";

export class Transaction {
  static async create(
    memberId,
    type,
    amount
  ) {
    const result = await pool.query(
      `
      INSERT INTO transactions
      (
        member_id,
        type,
        amount
      )
      VALUES ($1,$2,$3)
      RETURNING *;
      `,
      [
        memberId,
        type,
        amount,
      ]
    );

    return result.rows[0];
  }
}