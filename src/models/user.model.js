import { pool } from "../config/database.js";

export class User {
  static async create(userData) {
    const {
      name,
      email,
      password,
    } = userData;

    const query = `
      INSERT INTO users
      (
        name,
        email,
        password
      )
      VALUES ($1,$2,$3)
      RETURNING id,name,email;
    `;

    const result =
      await pool.query(query, [
        name,
        email,
        password,
      ]);

    return result.rows[0];
  }

  static async findByEmail(email) {
    const result =
      await pool.query(
        `
        SELECT *
        FROM users
        WHERE email = $1
        `,
        [email]
      );

    return result.rows[0];
    }
}