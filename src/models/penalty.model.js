import { pool } from "../config/database.js";

export class Penalty {
  static async findAll() {
    const result = await pool.query(`
      SELECT p.*, m.first_name, m.last_name
      FROM penalties p
      JOIN members m ON m.id = p.member_id
      ORDER BY p.created_at DESC
    `);
    return result.rows;
  }

  static async create(data) {
    const result = await pool.query(
      `INSERT INTO penalties (member_id, amount, reason, status, due_date, paid_at)
       VALUES (
         $1,
         $2,
         $3,
         $4::varchar,
         $5,
         CASE WHEN $4::varchar = 'paid' THEN NOW() ELSE NULL END
       )
       RETURNING *`,
      [data.member_id, data.amount, data.reason, data.status || "unpaid", data.due_date || null],
    );
    return result.rows[0];
  }

  static async updateById(id, data) {
    const result = await pool.query(
      `UPDATE penalties SET
         member_id = COALESCE($2, member_id),
         amount = COALESCE($3, amount),
         reason = COALESCE($4, reason),
         status = COALESCE($5, status),
         due_date = COALESCE($6, due_date),
         paid_at = CASE
           WHEN COALESCE($5, status) = 'paid' THEN COALESCE(paid_at, NOW())
           ELSE NULL
         END,
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, data.member_id, data.amount, data.reason, data.status, data.due_date],
    );
    return result.rows[0];
  }

  static async deleteById(id) {
    const result = await pool.query(
      "DELETE FROM penalties WHERE id = $1 RETURNING *",
      [id],
    );
    return result.rows[0];
  }
}

