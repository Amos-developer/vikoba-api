import { pool } from "../config/database.js";
import { Approval } from "./approval.model.js";

export class Expense {
  static async findAll() {
    const [records, totals] = await Promise.all([
      pool.query(`SELECT e.*, requester.name AS requested_by_name,
        approver.name AS approved_by_name
        FROM group_expenses e
        JOIN users requester ON requester.id=e.requested_by
        LEFT JOIN users approver ON approver.id=e.approved_by
        ORDER BY e.expense_date DESC,e.id DESC`),
      pool.query(`SELECT
        COALESCE(SUM(amount) FILTER (WHERE status='approved'),0) AS approved,
        COALESCE(SUM(amount) FILTER (WHERE status='pending'),0) AS pending,
        COUNT(*) FILTER (WHERE status='approved')::int AS approved_count
        FROM group_expenses`),
    ]);
    return { expenses: records.rows, summary: totals.rows[0] };
  }

  static async create(data) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(`INSERT INTO group_expenses
        (category,amount,payee,description,reference,expense_date,requested_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [data.category,data.amount,data.payee||null,data.description,
        data.reference||null,data.expense_date,data.requested_by]);
      const expense = result.rows[0];
      const approval = await Approval.create({ action_type:"expense", entity_id:expense.id,
        payload:{ amount:data.amount, description:data.description,
          reference:data.reference||null, category:data.category, payee:data.payee||null,
          expense_date:data.expense_date },
        reason:`${data.category.replaceAll("_"," ")}: ${data.description}`,
        requested_by:data.requested_by }, client);
      await client.query("UPDATE group_expenses SET approval_request_id=$2 WHERE id=$1", [expense.id,approval.id]);
      await client.query("COMMIT");
      return { ...expense, approval_request_id:approval.id };
    } catch(error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
}
