import {pool} from "../config/database.js";

export class Transaction {

  static async create(data) {

    const query = `
      INSERT INTO transactions
      (
        member_id,
        amount,
        type,
        description
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
    `;

    const values = [
      data.member_id,
      data.amount,
      data.type,
      data.description
    ];

    const result =
      await pool.query(
        query,
        values
      );

    return result.rows[0];
  }

  static async findAll() {

    const result =
      await pool.query(`
        SELECT *
        FROM transactions
        ORDER BY created_at DESC
      `);

    return result.rows;
  }

}