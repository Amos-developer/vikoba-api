import { pool } from "../config/database.js";

export class Transaction {
  static async hasLedgerSchema() {
    const result = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'transactions'
        AND column_name IN ('direction', 'reference', 'recorded_by')
    `);
    return result.rows[0].count === 3;
  }

  static async create(data) {
    if (!(await this.hasLedgerSchema())) {
      const error = new Error(
        "The financial ledger migration is pending. Run npm run db:migrate with the PostgreSQL table-owner account.",
      );
      error.statusCode = 503;
      throw error;
    }
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
    const hasLedgerSchema = await this.hasLedgerSchema();
    const conditions = [];
    const values = [];
    const add = (condition, value) => {
      values.push(value);
      conditions.push(condition.replace("?", `$${values.length}`));
    };

    if (filters.type) {
      const compatibleType = !hasLedgerSchema && filters.type === "loan_disbursement"
        ? "loan"
        : filters.type;
      add("t.type = ?", compatibleType);
    }
    if (filters.direction && hasLedgerSchema) add("t.direction = ?", filters.direction);
    if (filters.from) add("t.created_at >= ?", filters.from);
    if (filters.to) add("t.created_at < (?::date + INTERVAL '1 day')", filters.to);
    if (filters.search) {
      values.push(`%${filters.search}%`);
      const searchParameter = `$${values.length}`;
      conditions.push(`(
        LOWER(COALESCE(m.first_name || ' ' || m.last_name, '')) LIKE LOWER(${searchParameter})
        ${hasLedgerSchema ? `OR LOWER(COALESCE(t.reference, '')) LIKE LOWER(${searchParameter})` : ""}
        OR LOWER(COALESCE(t.description, '')) LIKE LOWER(${searchParameter})
      )`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT t.*,
         ${hasLedgerSchema
           ? "t.direction, t.reference, u.name AS recorded_by_name"
           : `CASE WHEN t.type IN ('saving', 'repayment') THEN 'inflow' ELSE 'outflow' END AS direction,
              NULL::varchar AS reference, NULL::varchar AS recorded_by_name`},
         m.first_name, m.last_name
       FROM transactions t
       LEFT JOIN members m ON m.id = t.member_id
       ${hasLedgerSchema ? "LEFT JOIN users u ON u.id = t.recorded_by" : ""}
       ${where}
       ORDER BY t.created_at DESC, t.id DESC`,
      values,
    );
    return result.rows;
  }
}


