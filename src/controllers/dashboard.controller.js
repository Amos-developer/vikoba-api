import { pool } from "../config/database.js";

export const getDashboardStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM members) AS total_members,
        (SELECT COALESCE(SUM(amount),0) FROM savings) AS total_savings,
        (SELECT COUNT(*) FROM loans WHERE status = 'approved') AS active_loans
    `);

    const stats = result.rows[0];

    return res.json({
      totalMembers: Number(stats.total_members || 0),
      totalSavings: Number(stats.total_savings || 0),
      activeLoans: Number(stats.active_loans || 0),
    });

  } catch (error) {
    console.error("DASHBOARD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Dashboard stats failed",
      error: error.message,
    });
  }
};

// Get recent Members
export const getRecentMembers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        first_name,
        last_name,
        phone
      FROM members
      ORDER BY id DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get recent transactions
export const getRecentTransactions = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.id,
        m.first_name || ' ' || m.last_name AS member_name,
        t.amount,
        t.type AS transaction_type,
        t.created_at
      FROM transactions t
      JOIN members m ON m.id = t.member_id
      ORDER BY t.created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};