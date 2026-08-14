import { pool } from "../config/database.js";

export class Transaction {
  static async create(data) {
    const result = await pool.query(
      `INSERT INTO transactions
        (member_id, amount, type, direction, description, reference, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [data.member_id || null, data.amount, data.type, data.direction,
        data.description, data.reference || null, data.recorded_by],
    );
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    const conditions = [];
    const values = [];
    const add = (condition, value) => {
      values.push(value);
      conditions.push(condition.replace("?", `$${values.length}`));
    };

    if (filters.type) add("t.type = ?", filters.type);
    if (filters.direction) add("t.direction = ?", filters.direction);
    if (filters.from) add("t.created_at >= ?", filters.from);
    if (filters.to) add("t.created_at < (?::date + INTERVAL '1 day')", filters.to);
    if (filters.search) {
      values.push(`%${filters.search}%`);
      const searchParameter = `$${values.length}`;
      conditions.push(`(
        LOWER(COALESCE(m.first_name || ' ' || m.last_name, '')) LIKE LOWER(${searchParameter})
        OR LOWER(COALESCE(t.reference, '')) LIKE LOWER(${searchParameter})
        OR LOWER(COALESCE(t.description, '')) LIKE LOWER(${searchParameter})
      )`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT t.*, m.first_name, m.last_name, u.name AS recorded_by_name
       FROM transactions t
       LEFT JOIN members m ON m.id = t.member_id
       LEFT JOIN users u ON u.id = t.recorded_by
       ${where}
       ORDER BY t.created_at DESC, t.id DESC`,
      values,
    );
    return result.rows;
  }
}


