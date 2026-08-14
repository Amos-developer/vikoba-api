import { pool } from "../config/database.js";

export class Approval {
  static async findAll(status = null) {
    const result = await pool.query(
      `SELECT a.*, requester.name AS requested_by_name,
              requester.role AS requester_role, reviewer.name AS reviewed_by_name
       FROM approval_requests a
       JOIN users requester ON requester.id = a.requested_by
       LEFT JOIN users reviewer ON reviewer.id = a.reviewed_by
       WHERE ($1::varchar IS NULL OR a.status = $1::varchar)
       ORDER BY CASE WHEN a.status = 'pending' THEN 0 ELSE 1 END, a.created_at DESC`,
      [status],
    );
    return result.rows;
  }

  static async create(data) {
    if (data.entity_id) {
      const duplicate = await pool.query(
        `SELECT id FROM approval_requests
         WHERE action_type = $1 AND entity_id = $2 AND status = 'pending'`,
        [data.action_type, data.entity_id],
      );
      if (duplicate.rowCount) {
        const error = new Error("This action already has a pending approval request");
        error.statusCode = 409;
        throw error;
      }
    }
    const result = await pool.query(
      `INSERT INTO approval_requests
        (action_type, entity_id, payload, reason, requested_by)
       VALUES ($1,$2,$3::jsonb,$4,$5) RETURNING *`,
      [data.action_type, data.entity_id || null, JSON.stringify(data.payload || {}),
        data.reason, data.requested_by],
    );
    return result.rows[0];
  }

  static async review(id, reviewerId, decision, note) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const requestResult = await client.query(
        "SELECT * FROM approval_requests WHERE id = $1 FOR UPDATE",
        [id],
      );
      const request = requestResult.rows[0];
      if (!request) {
        const error = new Error("Approval request not found");
        error.statusCode = 404;
        throw error;
      }
      if (request.status !== "pending") {
        const error = new Error("This request has already been reviewed");
        error.statusCode = 409;
        throw error;
      }
      if (Number(request.requested_by) === Number(reviewerId)) {
        const error = new Error("You cannot approve or reject your own request");
        error.statusCode = 403;
        throw error;
      }

      if (decision === "approved") {
        await this.execute(client, request, reviewerId);
      }
      const reviewed = await client.query(
        `UPDATE approval_requests SET status = $2, reviewed_by = $3,
           review_note = $4, reviewed_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, decision, reviewerId, note || null],
      );
      await client.query("COMMIT");
      return reviewed.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async execute(client, request, reviewerId) {
    const payload = request.payload;
    if (request.action_type === "loan_disbursement") {
      const loanResult = await client.query(
        "SELECT * FROM loans WHERE id = $1 FOR UPDATE",
        [request.entity_id],
      );
      const loan = loanResult.rows[0];
      if (!loan) throw Object.assign(new Error("Loan not found"), { statusCode: 404 });
      await client.query(
        "UPDATE loans SET status = 'approved', approved_at = COALESCE(approved_at, NOW()) WHERE id = $1",
        [loan.id],
      );
      const reference = `LOAN-${loan.id}-DISBURSEMENT`;
      await client.query(
        `INSERT INTO transactions
          (member_id, amount, type, direction, description, reference, recorded_by)
         VALUES ($1,$2,'loan_disbursement','outflow',$3,$4,$5)
         ON CONFLICT (reference) WHERE reference IS NOT NULL DO NOTHING`,
        [loan.member_id, loan.amount, `Loan #${loan.id} disbursed`, reference, reviewerId],
      );
    } else if (["withdrawal", "expense"].includes(request.action_type)) {
      await client.query(
        `INSERT INTO transactions
          (member_id, amount, type, direction, description, reference, recorded_by)
         VALUES ($1,$2,$3,'outflow',$4,$5,$6)`,
        [payload.member_id || null, payload.amount, request.action_type,
          payload.description, payload.reference || null, reviewerId],
      );
    } else if (request.action_type === "penalty_waiver") {
      const result = await client.query(
        "UPDATE penalties SET status = 'waived', updated_at = NOW() WHERE id = $1 RETURNING id",
        [request.entity_id],
      );
      if (!result.rowCount) throw Object.assign(new Error("Penalty not found"), { statusCode: 404 });
    } else if (request.action_type === "social_fund_disbursement") {
      const balanceResult = await client.query(`
        SELECT COALESCE(SUM(CASE WHEN entry_type='contribution' THEN amount ELSE -amount END),0) AS balance
        FROM social_fund_entries
      `);
      if (Number(payload.amount) > Number(balanceResult.rows[0].balance)) {
        const error = new Error("Social-fund balance is insufficient for this support payment");
        error.statusCode = 400; throw error;
      }
      const entry = await client.query(
        `INSERT INTO social_fund_entries
          (entry_type, category, member_id, beneficiary_name, amount,
           description, reference, recorded_by, approval_request_id)
         VALUES ('disbursement',$1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [payload.category, payload.member_id || null, payload.beneficiary_name,
          payload.amount, payload.description, payload.reference || null,
          reviewerId, request.id],
      );
      await client.query(
        `INSERT INTO transactions
          (member_id, amount, type, direction, description, reference, recorded_by)
         VALUES ($1,$2,'social_fund','outflow',$3,$4,$5)`,
        [payload.member_id || null, payload.amount, payload.description,
          payload.reference || `SOCIAL-OUT-${entry.rows[0].id}`, reviewerId],
      );
    }
  }
}

