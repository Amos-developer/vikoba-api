import { pool } from "../config/database.js";

export class Loan {
  static async create(memberId, amount) {
    const interestRate = 10;

    const totalPayable =
      Number(amount) +
      (Number(amount) * interestRate) / 100;

    const result = await pool.query(
      `
      INSERT INTO loans (
        member_id,
        amount,
        interest_rate,
        total_payable,
        remaining_balance
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *;
      `,
      [
        memberId,
        amount,
        interestRate,
        totalPayable,
        totalPayable,
      ]
    );

    return result.rows[0];
  }

  static async getAll() {
    const result = await pool.query(`
      SELECT
        l.*,
        m.first_name,
        m.last_name
      FROM loans l
      JOIN members m
      ON l.member_id = m.id
      ORDER BY l.id DESC
    `);

    return result.rows;
  }

  static async approve(id) {
    const result = await pool.query(
      `
      UPDATE loans
      SET
      status='approved',
      approved_at=NOW()
      WHERE id=$1
      RETURNING *;
      `,
      [id]
    );

    return result.rows[0];
  }
}