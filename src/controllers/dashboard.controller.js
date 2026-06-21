import { pool } from "../config/database.js";

const tableExists = async (tableName) => {
  const result = await pool.query("SELECT to_regclass($1) AS table_name", [
    `public.${tableName}`,
  ]);

  return Boolean(result.rows[0]?.table_name);
};

const columnExists = async (tableName, columnName) => {
  const result = await pool.query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
    ) AS exists
    `,
    [tableName, columnName]
  );

  return Boolean(result.rows[0]?.exists);
};

export const getDashboardStats = async (req, res) => {
  try {
    const [
      hasMembers,
      hasSavings,
      hasLoans,
    ] = await Promise.all([
      tableExists("members"),
      tableExists("savings"),
      tableExists("loans"),
    ]);

    const [
      membersResult,
      savingsResult,
      loansResult,
    ] = await Promise.all([
      hasMembers
        ? pool.query("SELECT COUNT(*) AS total FROM members")
        : Promise.resolve({ rows: [{ total: 0 }] }),
      hasSavings
        ? pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM savings")
        : Promise.resolve({ rows: [{ total: 0 }] }),
      hasLoans
        ? pool.query("SELECT COUNT(*) AS total FROM loans WHERE status = 'approved'")
        : Promise.resolve({ rows: [{ total: 0 }] }),
    ]);

    return res.json({
      success: true,
      data: {
        totalMembers: Number(membersResult.rows[0]?.total || 0),
        totalSavings: Number(savingsResult.rows[0]?.total || 0),
        activeLoans: Number(loansResult.rows[0]?.total || 0),
      },
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
    const hasMembers = await tableExists("members");

    if (!hasMembers) {
      return res.json({
        success: true,
        data: []
      });
    }

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
    const [
      hasTransactions,
      hasMembers,
    ] = await Promise.all([
      tableExists("transactions"),
      tableExists("members"),
    ]);

    if (!hasTransactions || !hasMembers) {
      return res.json({
        success: true,
        data: []
      });
    }

    const hasCreatedAt = await columnExists("transactions", "created_at");
    const orderColumn = hasCreatedAt ? "t.created_at" : "t.id";

    const result = await pool.query(`
      SELECT
        t.id,
        m.first_name || ' ' || m.last_name AS member_name,
        t.amount,
        t.type AS transaction_type,
        ${hasCreatedAt ? "t.created_at" : "NULL AS created_at"}
      FROM transactions t
      JOIN members m ON m.id = t.member_id
      ORDER BY ${orderColumn} DESC
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
