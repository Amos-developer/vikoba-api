import { pool } from "../config/database.js";

const filters = (alias, dateColumn = "created_at") => `
  ($1::bigint IS NULL OR ${alias}.member_id = $1)
  AND ($2::date IS NULL OR ${alias}.${dateColumn} >= $2::date)
  AND ($3::date IS NULL OR ${alias}.${dateColumn} < ($3::date + INTERVAL '1 day'))
`;

export class Report {
  static async generate({ memberId = null, from = null, to = null }) {
    const params = [memberId, from, to];
    const repaymentsExist = await pool.query(
      "SELECT to_regclass('public.loan_repayments') IS NOT NULL AS exists",
    );
    const savingsCreatedAt = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'savings'
          AND column_name = 'created_at'
      ) AS exists
    `);

    const [statement, savings, loans, repayments, incomeExpense, socialFund, cash] =
      await Promise.all([
        pool.query(
          `SELECT t.id, t.created_at, t.type, t.direction, t.amount,
                  t.description, t.reference, m.first_name, m.last_name
           FROM transactions t
           LEFT JOIN members m ON m.id = t.member_id
           WHERE ${filters("t")}
           ORDER BY t.created_at DESC, t.id DESC`,
          params,
        ),
        pool.query(
          `SELECT m.id AS member_id, m.first_name, m.last_name,
                  COUNT(s.id)::int AS contribution_count,
                  COALESCE(SUM(s.amount), 0) AS total_savings,
                  ${savingsCreatedAt.rows[0].exists
                    ? "MAX(s.created_at)"
                    : "NULL::timestamptz"} AS last_contribution_at
           FROM members m
           LEFT JOIN savings s ON s.member_id = m.id
             ${savingsCreatedAt.rows[0].exists
               ? `AND ($2::date IS NULL OR s.created_at >= $2::date)
                  AND ($3::date IS NULL OR s.created_at < ($3::date + INTERVAL '1 day'))`
               : ""}
           WHERE ($1::bigint IS NULL OR m.id = $1)
           GROUP BY m.id, m.first_name, m.last_name
           ORDER BY total_savings DESC`,
          savingsCreatedAt.rows[0].exists ? params : [memberId],
        ),
        pool.query(
          `SELECT l.*, m.first_name, m.last_name
           FROM loans l JOIN members m ON m.id = l.member_id
           WHERE ${filters("l")}
             AND COALESCE(l.remaining_balance, 0) > 0
           ORDER BY l.remaining_balance DESC`,
          params,
        ),
        repaymentsExist.rows[0].exists
          ? pool.query(
              `SELECT r.*, m.first_name, m.last_name
               FROM loan_repayments r JOIN members m ON m.id = r.member_id
               WHERE ${filters("r", "paid_at")}
               ORDER BY r.paid_at DESC`,
              params,
            )
          : Promise.resolve({ rows: [] }),
        pool.query(
          `SELECT t.type, t.direction, COUNT(*)::int AS entry_count,
                  COALESCE(SUM(t.amount), 0) AS total
           FROM transactions t
           WHERE ${filters("t")}
           GROUP BY t.type, t.direction
           ORDER BY t.direction, t.type`,
          params,
        ),
        pool.query(
          `SELECT t.*, m.first_name, m.last_name
           FROM transactions t
           LEFT JOIN members m ON m.id = t.member_id
           WHERE ${filters("t")} AND t.type = 'social_fund'
           ORDER BY t.created_at DESC`,
          params,
        ),
        pool.query(
          `SELECT
             COALESCE(SUM(CASE WHEN t.direction = 'inflow' THEN t.amount ELSE 0 END), 0) AS inflow,
             COALESCE(SUM(CASE WHEN t.direction = 'outflow' THEN t.amount ELSE 0 END), 0) AS outflow,
             COALESCE(SUM(CASE WHEN t.direction = 'inflow' THEN t.amount ELSE -t.amount END), 0) AS balance
           FROM transactions t WHERE ${filters("t")}`,
          params,
        ),
      ]);

    const totals = incomeExpense.rows.reduce(
      (summary, row) => {
        const amount = Number(row.total);
        summary[row.direction] += amount;
        summary.byType[row.type] = (summary.byType[row.type] || 0) + amount;
        summary.byTypeAndDirection[`${row.type}_${row.direction}`] = amount;
        return summary;
      },
      { inflow: 0, outflow: 0, byType: {}, byTypeAndDirection: {} },
    );

    return {
      memberStatement: statement.rows,
      savings: savings.rows,
      outstandingLoans: loans.rows,
      repayments: repayments.rows,
      incomeExpense: incomeExpense.rows,
      socialFund: socialFund.rows,
      cashPosition: cash.rows[0],
      endOfCycle: {
        period: { from, to },
        totalInflows: totals.inflow,
        totalOutflows: totals.outflow,
        closingCash: totals.inflow - totals.outflow,
        totalSavings: totals.byType.saving || 0,
        totalRepayments: totals.byType.repayment || 0,
        totalFines: totals.byType.fine || 0,
        totalSocialFund:
          (totals.byTypeAndDirection.social_fund_inflow || 0) -
          (totals.byTypeAndDirection.social_fund_outflow || 0),
        totalSocialFundContributions:
          totals.byTypeAndDirection.social_fund_inflow || 0,
        totalSocialFundDisbursements:
          totals.byTypeAndDirection.social_fund_outflow || 0,
        totalLoanDisbursements: totals.byType.loan_disbursement || 0,
        totalExpenses: totals.byType.expense || 0,
        outstandingLoanBalance: loans.rows.reduce(
          (sum, loan) => sum + Number(loan.remaining_balance || 0),
          0,
        ),
      },
    };
  }
}
