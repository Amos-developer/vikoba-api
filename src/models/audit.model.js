import { pool } from '../config/database.js';
export class Audit { static async findAll(filters={}){const values=[];const conditions=[];const add=(sql,value)=>{values.push(value);conditions.push(sql.replace('?',`$${values.length}`));};
  if(filters.action)add('a.action=?',filters.action);if(filters.entity_type)add('a.entity_type=?',filters.entity_type);if(filters.user_id)add('a.user_id=?',filters.user_id);
  if(filters.from)add('a.created_at>=?::date',filters.from);if(filters.to)add("a.created_at<(?::date+INTERVAL '1 day')",filters.to);
  if(filters.search){values.push(`%${filters.search}%`);const p=`$${values.length}`;conditions.push(`(LOWER(COALESCE(u.name,'')) LIKE LOWER(${p}) OR LOWER(a.entity_type) LIKE LOWER(${p}) OR LOWER(a.action) LIKE LOWER(${p}) OR LOWER(COALESCE(a.entity_id,'')) LIKE LOWER(${p}))`);}
  const where=conditions.length?`WHERE ${conditions.join(' AND ')}`:'';const result=await pool.query(`SELECT a.*,u.name AS user_name,u.email AS user_email,u.role AS user_role
    FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ${where} ORDER BY a.created_at DESC LIMIT 1000`,values);return result.rows;}}
