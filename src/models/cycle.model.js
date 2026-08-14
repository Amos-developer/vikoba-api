import { pool } from "../config/database.js";

export class Cycle {
  static async findAll() {
    const result = await pool.query(`
      SELECT c.*, creator.name AS created_by_name, closer.name AS closed_by_name,
             COALESCE((SELECT json_agg(json_build_object(
               'member_id', s.member_id, 'first_name', m.first_name,
               'last_name', m.last_name, 'savings_amount', s.savings_amount,
               'savings_ratio', s.savings_ratio, 'earnings_share', s.earnings_share,
               'projected_shareout', s.projected_shareout,
               'distribution_status', s.distribution_status
             ) ORDER BY s.projected_shareout DESC)
             FROM cycle_member_snapshots s JOIN members m ON m.id=s.member_id
             WHERE s.cycle_id=c.id), '[]'::json) AS member_snapshots
      FROM financial_cycles c
      LEFT JOIN users creator ON creator.id=c.created_by
      LEFT JOIN users closer ON closer.id=c.closed_by
      ORDER BY c.start_date DESC, c.id DESC
    `);
    return result.rows;
  }

  static async create(data) {
    const result = await pool.query(
      `INSERT INTO financial_cycles (name,start_date,end_date,status,created_by)
       VALUES ($1,$2,$3,'draft',$4) RETURNING *`,
      [data.name, data.start_date, data.end_date, data.created_by],
    );
    return result.rows[0];
  }

  static async activate(id) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const cycle = await client.query("SELECT * FROM financial_cycles WHERE id=$1 FOR UPDATE", [id]);
      if (!cycle.rowCount) throw Object.assign(new Error("Financial cycle not found"), { statusCode: 404 });
      if (cycle.rows[0].status !== "draft") throw Object.assign(new Error("Only a draft cycle can be activated"), { statusCode: 409 });
      const active = await client.query("SELECT id FROM financial_cycles WHERE status IN ('active','closing') FOR UPDATE");
      if (active.rowCount) throw Object.assign(new Error("Complete the current cycle and all share-outs before activating another"), { statusCode: 409 });
      const result = await client.query("UPDATE financial_cycles SET status='active',updated_at=NOW() WHERE id=$1 RETURNING *", [id]);
      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  static async close(id, userId, notes) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const cycleResult = await client.query("SELECT * FROM financial_cycles WHERE id=$1 FOR UPDATE", [id]);
      const cycle = cycleResult.rows[0];
      if (!cycle) throw Object.assign(new Error("Financial cycle not found"), { statusCode: 404 });
      if (cycle.status !== "active") throw Object.assign(new Error("Only an active cycle can be closed"), { statusCode: 409 });
      const params = [cycle.id];
      const [finance, savings, loans, obligations] = await Promise.all([
        client.query(`SELECT
          COALESCE(SUM(amount) FILTER (WHERE direction='inflow'),0) AS inflows,
          COALESCE(SUM(amount) FILTER (WHERE direction='outflow'),0) AS outflows,
          COALESCE(SUM(amount) FILTER (WHERE type='fine' AND direction='inflow'),0) AS fine_income,
          COALESCE(SUM(amount) FILTER (WHERE type='other_income' AND direction='inflow'),0) AS other_income,
          COALESCE(SUM(amount) FILTER (WHERE type='expense' AND direction='outflow'),0) AS expenses,
          COALESCE(SUM(amount) FILTER (WHERE type='fine' AND direction='inflow'),0) -
          COALESCE(SUM(amount) FILTER (WHERE type='expense' AND direction='outflow'),0) +
          COALESCE(SUM(amount) FILTER (WHERE type='other_income' AND direction='inflow'),0) +
          COALESCE((SELECT SUM(r.amount * ((l.total_payable-l.amount) / NULLIF(l.total_payable,0)))
            FROM loan_repayments r JOIN loans l ON l.id=r.loan_id
            WHERE r.cycle_id=$1),0)
          AS distributable_earnings
          FROM transactions WHERE cycle_id=$1`, params),
        client.query(`SELECT m.id AS member_id, COALESCE(SUM(s.amount),0) AS savings
          FROM members m LEFT JOIN savings s ON s.member_id=m.id AND s.cycle_id=$1
          GROUP BY m.id ORDER BY m.id`, params),
        client.query(`SELECT COALESCE(SUM(remaining_balance),0) AS outstanding
          FROM loans WHERE cycle_id=$1 AND remaining_balance > 0`, params),
        client.query(`SELECT
          COUNT(*) FILTER (WHERE p.status='unpaid')::int AS unpaid_penalties,
          COALESCE(SUM(p.amount) FILTER (WHERE p.status='unpaid'),0) AS unpaid_penalty_amount,
          (SELECT COUNT(*)::int FROM group_expenses e WHERE e.cycle_id=$1 AND e.status='pending') AS pending_expenses,
          (SELECT COUNT(*)::int FROM approval_requests a WHERE a.status='pending') AS pending_approvals
          FROM penalties p WHERE p.cycle_id=$1`,params),
      ]);
      const blockers=[];
      if(Number(loans.rows[0].outstanding)>0) blockers.push(`outstanding loans: ${loans.rows[0].outstanding}`);
      if(Number(obligations.rows[0].unpaid_penalties)>0) blockers.push(`unpaid penalties: ${obligations.rows[0].unpaid_penalties}`);
      if(Number(obligations.rows[0].pending_expenses)>0) blockers.push(`pending expenses: ${obligations.rows[0].pending_expenses}`);
      if(Number(obligations.rows[0].pending_approvals)>0) blockers.push(`pending approvals: ${obligations.rows[0].pending_approvals}`);
      if(blockers.length) throw Object.assign(new Error(`Resolve closing obligations first (${blockers.join(', ')})`),{statusCode:409});
      const totalSavings = savings.rows.reduce((sum, row) => sum + Number(row.savings), 0);
      const earnings = Math.max(0, Number(finance.rows[0].distributable_earnings));
      for (const member of savings.rows) {
        const memberSavings = Number(member.savings);
        if (memberSavings <= 0) continue;
        const share = totalSavings > 0 ? earnings * memberSavings / totalSavings : 0;
        const ratio = totalSavings > 0 ? memberSavings / totalSavings : 0;
        await client.query(`INSERT INTO cycle_member_snapshots
          (cycle_id,member_id,savings_amount,savings_ratio,earnings_share,projected_shareout)
          VALUES ($1,$2,$3,$4,$5,$6)`, [id, member.member_id, memberSavings, ratio, share, memberSavings + share]);
      }
      const summary = { totalSavings, totalInflows: Number(finance.rows[0].inflows),
        totalOutflows: Number(finance.rows[0].outflows), distributableEarnings: earnings,
        fineIncome:Number(finance.rows[0].fine_income),otherIncome:Number(finance.rows[0].other_income),
        expenses:Number(finance.rows[0].expenses),
        unpaidPenalties:Number(obligations.rows[0].unpaid_penalty_amount),
        projectedShareout: totalSavings + earnings,
        outstandingLoans: Number(loans.rows[0].outstanding),
        memberCount: savings.rows.filter((member) => Number(member.savings) > 0).length };
      const result = await client.query(`UPDATE financial_cycles SET status='closing',
        closing_notes=$2,closing_summary=$3::jsonb,updated_at=NOW()
        WHERE id=$1 RETURNING *`, [id, notes || null, JSON.stringify(summary)]);
      await client.query("COMMIT");
      return { ...result.rows[0], member_snapshots: savings.rows };
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
}
