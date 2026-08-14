import { pool } from "../config/database.js";

export class SocialFund {
  static async findAll() {
    const [entries, requests, totals] = await Promise.all([
      pool.query(`
        SELECT sf.*, m.first_name, m.last_name, u.name AS recorded_by_name,
               'completed'::varchar AS approval_status
        FROM social_fund_entries sf
        LEFT JOIN members m ON m.id = sf.member_id
        LEFT JOIN users u ON u.id = sf.recorded_by
        ORDER BY sf.created_at DESC, sf.id DESC
      `),
      pool.query(`
        SELECT ('approval-' || a.id)::varchar AS id,
               'disbursement'::varchar AS entry_type,
               CONCAT(
                 a.payload->>'category',
                 CASE a.status
                   WHEN 'pending' THEN ' - pending approval'
                   ELSE ' - rejected'
                 END
               ) AS category,
               NULLIF(a.payload->>'member_id', '')::bigint AS member_id,
               a.payload->>'beneficiary_name' AS beneficiary_name,
               (a.payload->>'amount')::numeric AS amount,
               a.payload->>'description' AS description,
               a.payload->>'reference' AS reference,
               a.requested_by AS recorded_by, a.created_at,
               m.first_name, m.last_name, u.name AS recorded_by_name,
               a.status AS approval_status
        FROM approval_requests a
        LEFT JOIN members m ON m.id = NULLIF(a.payload->>'member_id', '')::bigint
        JOIN users u ON u.id = a.requested_by
        WHERE a.action_type = 'social_fund_disbursement'
          AND a.status IN ('pending', 'rejected')
        ORDER BY a.created_at DESC, a.id DESC
      `),
      pool.query(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE entry_type='contribution'),0) AS contributions,
          COALESCE(SUM(amount) FILTER (WHERE entry_type='disbursement'),0) AS disbursements,
          COALESCE(SUM(CASE WHEN entry_type='contribution' THEN amount ELSE -amount END),0) AS balance
        FROM social_fund_entries
      `),
    ]);
    const activity = [...entries.rows, ...requests.rows].sort(
      (left, right) => new Date(right.created_at) - new Date(left.created_at),
    );
    return {
      entries: activity,
      summary: {
        ...totals.rows[0],
        pending: requests.rows.filter((request) => request.approval_status === "pending").length,
      },
    };
  }

  static async createContribution(data) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const entry = await client.query(
        `INSERT INTO social_fund_entries
          (entry_type, category, member_id, amount, description, reference, recorded_by)
         VALUES ('contribution','contribution',$1,$2,$3,$4,$5) RETURNING *`,
        [data.member_id, data.amount, data.description,
          data.reference || null, data.recorded_by],
      );
      await client.query(
        `INSERT INTO transactions
          (member_id, amount, type, direction, description, reference, recorded_by)
         VALUES ($1,$2,'social_fund','inflow',$3,$4,$5)`,
        [data.member_id, data.amount, data.description,
          data.reference || `SOCIAL-IN-${entry.rows[0].id}`, data.recorded_by],
      );
      await client.query("COMMIT");
      return entry.rows[0];
    } catch (error) {
      await client.query("ROLLBACK"); throw error;
    } finally { client.release(); }
  }
}
