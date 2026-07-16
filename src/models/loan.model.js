import { pool } from "../config/database.js";

export class Loan {
  static async create(payload = {}) {
    const memberId = payload.member_id ?? payload.memberId;
    const amount = Number(payload.amount ?? 0);
    const interestRate = Number(
      payload.interest_rate ?? payload.interestRate ?? 10,
    );
    const status = payload.status ?? "pending";
    const totalPayable = Number(
      payload.total_payable ??
        payload.totalPayable ??
        amount + (amount * interestRate) / 100,
    );
    const remainingBalance = Number(
      payload.remaining_balance ?? payload.remainingBalance ?? totalPayable,
    );

    const result = await pool.query(
      `
      INSERT INTO loans (
        member_id,
        amount,
        interest_rate,
        total_payable,
        remaining_balance,
        status,
        approved_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *;
      `,
      [
        memberId,
        amount,
        interestRate,
        totalPayable,
        remainingBalance,
        status,
        status === "approved" ? new Date().toISOString() : null,
      ],
    );

    return result.rows[0];
  }

  static async getAll() {
    const result = await pool.query(`
      SELECT
        l.*,
        m.first_name,
        m.last_name
      FROM loans l
      JOIN members m
      ON l.member_id = m.id
      ORDER BY l.id DESC
    `);

    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query(
      `
      SELECT
        l.*,
        m.first_name,
        m.last_name
      FROM loans l
      JOIN members m
      ON l.member_id = m.id
      WHERE l.id = $1
    `,
      [id],
    );

    return result.rows[0];
  }

  static async updateById(id, payload = {}) {
    const current = await this.getById(id);

    if (!current) return null;

    const memberId = payload.member_id ?? payload.memberId ?? current.member_id;
    const amount = Number(payload.amount ?? current.amount);
    const interestRate = Number(
      payload.interest_rate ??
        payload.interestRate ??
        current.interest_rate ??
        10,
    );
    const status = payload.status ?? current.status ?? "pending";
    const totalPayable = Number(
      payload.total_payable ??
        payload.totalPayable ??
        amount + (amount * interestRate) / 100,
    );
    const remainingBalance = Number(
      payload.remaining_balance ?? payload.remainingBalance ?? totalPayable,
    );
    const approvedAt = status === "approved" ? new Date().toISOString() : null;

    const result = await pool.query(
      `
      UPDATE loans
      SET
        member_id = $2,
        amount = $3,
        interest_rate = $4,
        total_payable = $5,
        remaining_balance = $6,
        status = $7,
        approved_at = $8
      WHERE id = $1
      RETURNING *;
      `,
      [
        id,
        memberId,
        amount,
        interestRate,
        totalPayable,
        remainingBalance,
        status,
        approvedAt,
      ],
    );

    return result.rows[0];
  }

  static async deleteById(id) {
    const result = await pool.query(
      `
      DELETE FROM loans
      WHERE id = $1
      RETURNING *;
      `,
      [id],
    );

    return result.rows[0];
  }

  static async approve(id) {
    const result = await pool.query(
      `
      UPDATE loans
      SET
      status='approved',
      approved_at=NOW()
      WHERE id=$1
      RETURNING *;
      `,
      [id],
    );

    return result.rows[0];
  }
}
