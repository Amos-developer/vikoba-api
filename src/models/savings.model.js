import { pool } from "../config/database.js";

export class Saving {

  static async create(
    memberId,
    amount
  ) {

    const result =
      await pool.query(
        `
        INSERT INTO savings
        (member_id, amount)
        VALUES ($1,$2)
        RETURNING *;
        `,
        [memberId, amount]
      );

    return result.rows[0];
  }

}