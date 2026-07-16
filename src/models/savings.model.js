import { pool } from "../config/database.js";

export class Saving {
  static async create(payload = {}) {
    const memberId = payload.member_id ?? payload.memberId;
    const amount = Number(payload.amount ?? 0);

    const result = await pool.query(
      `
      INSERT INTO savings
      (member_id, amount)
      VALUES ($1,$2)
      RETURNING *;
      `,
      [memberId, amount],
    );

    return result.rows[0];
  }

  static async getAll() {
    const result = await pool.query(`
      SELECT
        s.*,
        m.first_name,
        m.last_name
      FROM savings s
      JOIN members m
      ON s.member_id = m.id
      ORDER BY s.id DESC
    `);

    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query(
      `
      SELECT
        s.*,
        m.first_name,
        m.last_name
      FROM savings s
      JOIN members m
      ON s.member_id = m.id
      WHERE s.id = $1
    `,
      [id],
    );

    return result.rows[0];
  }

  static async updateById(id, payload = {}) {
    const memberId = payload.member_id ?? payload.memberId;
    const amount = Number(payload.amount ?? 0);

    const result = await pool.query(
      `
      UPDATE savings
      SET member_id = $2,
          amount = $3
      WHERE id = $1
      RETURNING *;
      `,
      [id, memberId, amount],
    );

    return result.rows[0];
  }

  static async deleteById(id) {
    const result = await pool.query(
      `
      DELETE FROM savings
      WHERE id = $1
      RETURNING *;
      `,
      [id],
    );

    return result.rows[0];
  }
}
