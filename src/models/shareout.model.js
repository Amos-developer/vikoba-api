import { pool } from "../config/database.js";
import { Approval } from "./approval.model.js";

export class Shareout {
  static async findAll() {
    const result=await pool.query(`SELECT s.*,c.name AS cycle_name,c.closed_at,
      m.first_name,m.last_name,m.phone,a.status AS approval_status
      FROM cycle_member_snapshots s
      JOIN financial_cycles c ON c.id=s.cycle_id
      JOIN members m ON m.id=s.member_id
      LEFT JOIN approval_requests a ON a.id=s.approval_request_id
      ORDER BY c.closed_at DESC,s.projected_shareout DESC`);
    return result.rows;
  }
  static async requestPayment(id,userId) {
    const client=await pool.connect();
    try {
      await client.query("BEGIN");
      const result=await client.query(`SELECT s.*,c.name AS cycle_name,m.first_name,m.last_name
        FROM cycle_member_snapshots s JOIN financial_cycles c ON c.id=s.cycle_id
        JOIN members m ON m.id=s.member_id WHERE s.id=$1 FOR UPDATE`,[id]);
      const item=result.rows[0];
      if(!item) throw Object.assign(new Error("Share-out record not found"),{statusCode:404});
      if(item.distribution_status==='paid') throw Object.assign(new Error("This share-out has already been paid"),{statusCode:409});
      const approval=await Approval.create({action_type:'shareout_payment',entity_id:item.id,
        payload:{member_id:item.member_id,amount:Number(item.projected_shareout),cycle_id:item.cycle_id,
          description:`${item.cycle_name} share-out for ${item.first_name} ${item.last_name}`},
        reason:`Pay ${item.cycle_name} share-out to ${item.first_name} ${item.last_name}`,
        requested_by:userId},client);
      await client.query("UPDATE cycle_member_snapshots SET approval_request_id=$2 WHERE id=$1",[id,approval.id]);
      await client.query("COMMIT"); return approval;
    } catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
  }
}
