import { pool } from "../config/database.js";

export class Member {
    // Create a new member
  static async create(memberData) {
    const {
      first_name,
      last_name,
      phone,
      email,
    } = memberData;

    const query = `
      INSERT INTO members
      (
        first_name,
        last_name,
        phone,
        email
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *;
    `;

    const values = [
      first_name,
      last_name,
      phone,
      email,
    ];

    const result =
      await pool.query(query, values);

    return result.rows[0];
  }

//   Get all members
  static async findAll() {
    const result =
      await pool.query(
        "SELECT * FROM members ORDER BY id DESC"
      );

    return result.rows;
  }

//   Get a member by ID
  static async findById(id) {
    const result =
      await pool.query(
        "SELECT * FROM members WHERE id = $1",
        [id]
      );

    return result.rows[0];
  }
}