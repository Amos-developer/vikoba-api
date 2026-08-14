import { pool } from "../config/database.js";

const meetingSelect = `
  SELECT mt.*, u.name AS created_by_name,
    COUNT(ma.id)::int AS attendance_count,
    COUNT(ma.id) FILTER (WHERE ma.attendance_status = 'present')::int AS present_count,
    COUNT(ma.id) FILTER (WHERE ma.attendance_status = 'late')::int AS late_count,
    COUNT(ma.id) FILTER (WHERE ma.attendance_status = 'absent')::int AS absent_count,
    COUNT(ma.id) FILTER (WHERE ma.attendance_status = 'excused')::int AS excused_count,
    COALESCE(SUM(ma.contribution_amount), 0) AS contributions_collected,
    COALESCE(
      JSON_AGG(JSON_BUILD_OBJECT(
        'id', ma.id, 'member_id', ma.member_id,
        'first_name', m.first_name, 'last_name', m.last_name,
        'attendance_status', ma.attendance_status,
        'contribution_amount', ma.contribution_amount, 'notes', ma.notes
      ) ORDER BY m.first_name, m.last_name) FILTER (WHERE ma.id IS NOT NULL),
      '[]'::json
    ) AS attendance
  FROM meetings mt
  LEFT JOIN users u ON u.id = mt.created_by
  LEFT JOIN meeting_attendance ma ON ma.meeting_id = mt.id
  LEFT JOIN members m ON m.id = ma.member_id
`;

export class Meeting {
  static async findAll() {
    const result = await pool.query(`${meetingSelect}
      GROUP BY mt.id, u.name ORDER BY mt.meeting_date DESC`);
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(`${meetingSelect}
      WHERE mt.id = $1 GROUP BY mt.id, u.name`, [id]);
    return result.rows[0];
  }

  static async save(data, id = null) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      let meetingId = id;
      if (id) {
        const updated = await client.query(
          `UPDATE meetings SET meeting_date=$2, agenda=$3, decisions=$4,
             status=$5, updated_at=NOW() WHERE id=$1 RETURNING id`,
          [id, data.meeting_date, data.agenda, data.decisions || null, data.status],
        );
        if (!updated.rowCount) {
          await client.query("ROLLBACK");
          return null;
        }
        await client.query("DELETE FROM meeting_attendance WHERE meeting_id=$1", [id]);
      } else {
        const created = await client.query(
          `INSERT INTO meetings (meeting_date, agenda, decisions, status, created_by)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [data.meeting_date, data.agenda, data.decisions || null,
            data.status || "scheduled", data.created_by],
        );
        meetingId = created.rows[0].id;
      }

      for (const entry of data.attendance || []) {
        await client.query(
          `INSERT INTO meeting_attendance
            (meeting_id, member_id, attendance_status, contribution_amount, notes)
           VALUES ($1,$2,$3,$4,$5)`,
          [meetingId, entry.member_id, entry.attendance_status || "present",
            Number(entry.contribution_amount || 0), entry.notes || null],
        );
      }
      await client.query("COMMIT");
      return this.findById(meetingId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteById(id) {
    const result = await pool.query("DELETE FROM meetings WHERE id=$1 RETURNING id", [id]);
    return result.rows[0];
  }
}


