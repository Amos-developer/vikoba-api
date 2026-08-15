import { pool } from '../config/database.js';
export class Share {
  static async report(){const cycle=await pool.query("SELECT id,name,status FROM financial_cycles WHERE status IN ('active','closing') ORDER BY start_date DESC LIMIT 1");
    if(!cycle.rowCount)return{cycle:null,settings:null,purchases:[],members:[],summary:{shares:0,value:0,members:0}};const id=cycle.rows[0].id;
    const [settings,purchases,members,summary]=await Promise.all([
      pool.query('SELECT * FROM cycle_share_settings WHERE cycle_id=$1',[id]),
      pool.query(`SELECT p.*,m.first_name,m.last_name,u.name AS recorded_by_name FROM share_purchases p
        JOIN members m ON m.id=p.member_id LEFT JOIN users u ON u.id=p.recorded_by WHERE p.cycle_id=$1 ORDER BY p.purchased_at DESC,p.id DESC`,[id]),
      pool.query(`SELECT m.id AS member_id,m.first_name,m.last_name,m.phone,COALESCE(SUM(p.number_of_shares),0)::int AS shares,
        COALESCE(SUM(p.total_value),0) AS value FROM members m LEFT JOIN share_purchases p ON p.member_id=m.id AND p.cycle_id=$1
        GROUP BY m.id,m.first_name,m.last_name,m.phone ORDER BY value DESC,m.first_name`,[id]),
      pool.query(`SELECT COALESCE(SUM(number_of_shares),0)::int AS shares,COALESCE(SUM(total_value),0) AS value,
        COUNT(DISTINCT member_id)::int AS members FROM share_purchases WHERE cycle_id=$1`,[id]),
    ]);return{cycle:cycle.rows[0],settings:settings.rows[0]||null,purchases:purchases.rows,members:members.rows,summary:summary.rows[0]};}
  static async configure(data){const existing=await pool.query(`SELECT COUNT(*)::int AS count FROM share_purchases WHERE cycle_id=$1`,[data.cycle_id]);
    const current=await pool.query('SELECT * FROM cycle_share_settings WHERE cycle_id=$1',[data.cycle_id]);
    if(existing.rows[0].count>0&&current.rowCount&&Number(current.rows[0].share_price)!==Number(data.share_price))throw Object.assign(new Error('Share price cannot change after purchases have been recorded in this cycle'),{statusCode:409});
    const result=await pool.query(`INSERT INTO cycle_share_settings(cycle_id,share_price,minimum_shares,maximum_shares,configured_by)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT(cycle_id) DO UPDATE SET share_price=EXCLUDED.share_price,minimum_shares=EXCLUDED.minimum_shares,
      maximum_shares=EXCLUDED.maximum_shares,configured_by=EXCLUDED.configured_by,updated_at=NOW() RETURNING *`,
    [data.cycle_id,data.share_price,data.minimum_shares,data.maximum_shares||null,data.configured_by]);return result.rows[0];}
  static async purchase(data){const client=await pool.connect();try{await client.query('BEGIN');
    const settingsResult=await client.query(`SELECT s.* FROM cycle_share_settings s JOIN financial_cycles c ON c.id=s.cycle_id
      WHERE c.status='active' FOR UPDATE`);const settings=settingsResult.rows[0];if(!settings)throw Object.assign(new Error('Configure shares for the active cycle before recording purchases'),{statusCode:409});
    const owned=await client.query('SELECT COALESCE(SUM(number_of_shares),0)::int AS count FROM share_purchases WHERE cycle_id=$1 AND member_id=$2',[settings.cycle_id,data.member_id]);
    const total=Number(owned.rows[0].count)+data.number_of_shares;if(settings.maximum_shares&&total>Number(settings.maximum_shares))throw Object.assign(new Error(`Member cycle limit is ${settings.maximum_shares} shares; this purchase would make ${total}`),{statusCode:409});
    const result=await client.query(`INSERT INTO share_purchases(member_id,number_of_shares,share_price,reference,notes,recorded_by)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[data.member_id,data.number_of_shares,settings.share_price,data.reference||null,data.notes||null,data.recorded_by]);const item=result.rows[0];
    await client.query(`INSERT INTO transactions(member_id,amount,type,direction,description,reference,recorded_by,cycle_id)
      VALUES($1,$2,'share_purchase','inflow',$3,$4,$5,$6)`,[data.member_id,item.total_value,`${data.number_of_shares} Hisa purchased`,data.reference||`HISA-${item.id}`,data.recorded_by,item.cycle_id]);
    await client.query('COMMIT');return item;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}
}
