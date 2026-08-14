import { pool } from "../config/database.js";

export class Repayment {
  static async findAll() {
    const result = await pool.query(`
      SELECT r.*, m.first_name, m.last_name, u.name AS recorded_by_name
      FROM loan_repayments r
      JOIN members m ON m.id = r.member_id
      LEFT JOIN users u ON u.id = r.recorded_by
      ORDER BY r.paid_at DESC, r.id DESC
    `);
    return result.rows;
  }

  static async create(data) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const loanResult = await client.query(
        `SELECT id, member_id, remaining_balance, status
         FROM loans WHERE id = $1 FOR UPDATE`,
        [data.loan_id],
      );
      const loan = loanResult.rows[0];
      if (!loan) {
        const error = new Error("Loan not found");
        error.statusCode = 404;
        throw error;
      }
      if (!['approved', 'paid'].includes(loan.status) || Number(loan.remaining_balance) <= 0) {
        const error = new Error("Only an approved loan with an outstanding balance can receive repayments");
        error.statusCode = 400;
        throw error;
      }

      const amount = Number(data.amount);
      const balanceBefore = Number(loan.remaining_balance);
      if (amount > balanceBefore) {
        const error = new Error("Repayment cannot exceed the remaining loan balance");
        error.statusCode = 400;
        throw error;
      }
      const balanceAfter = balanceBefore - amount;
      const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
      const isLate = data.due_date
        ? paidAt.toISOString().slice(0, 10) > data.due_date
        : false;

      const repaymentResult = await client.query(
        `INSERT INTO loan_repayments
          (loan_id, member_id, amount, balance_before, balance_after,
           due_date, paid_at, is_late, reference, recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [loan.id, loan.member_id, amount, balanceBefore, balanceAfter,
          data.due_date || null, paidAt, isLate, data.reference || null,
          data.recorded_by],
      );

      await client.query(
        `UPDATE loans
         SET remaining_balance = $2::numeric,
             status = CASE WHEN $2::numeric = 0::numeric THEN 'paid' ELSE status END
         WHERE id = $1`,
        [loan.id, balanceAfter],
      );

      const ledgerReady = await client.query(`
        SELECT COUNT(*)::int AS count FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'transactions'
          AND column_name IN ('direction', 'reference', 'recorded_by')
      `);
      if (ledgerReady.rows[0].count === 3) {
        await client.query(
          `INSERT INTO transactions
            (member_id, amount, type, direction, description, reference, recorded_by)
           VALUES ($1,$2,'repayment','inflow',$3,$4,$5)`,
          [loan.member_id, amount, `Loan #${loan.id} repayment`,
            data.reference || `REPAY-${repaymentResult.rows[0].id}`, data.recorded_by],
        );
      }

      await client.query("COMMIT");
      return repaymentResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
