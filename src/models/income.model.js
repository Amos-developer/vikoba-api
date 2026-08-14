import { pool } from "../config/database.js";
import { Approval } from "./approval.model.js";

export class Income {
  static async report() {
    const cycle=await pool.query("SELECT id,name FROM financial_cycles WHERE status IN ('active','closing') ORDER BY start_date DESC LIMIT 1");
    if(!cycle.rowCount) return {cycle:null,records:[],summary:{fines:0,loan_interest:0,service_charges:0,other:0,total_income:0,expenses:0,profit:0}};
    const cycleId=cycle.rows[0].id;
    const [manual,fines,interest,expenses]=await Promise.all([
      pool.query(`SELECT i.*,u.name AS requested_by_name,a.name AS approved_by_name
        FROM group_income i JOIN users u ON u.id=i.requested_by LEFT JOIN users a ON a.id=i.approved_by
        WHERE i.cycle_id=$1 ORDER BY i.income_date DESC,i.id DESC`,[cycleId]),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM transactions
        WHERE cycle_id=$1 AND type='fine' AND direction='inflow'`,[cycleId]),
      pool.query(`SELECT COALESCE(SUM(r.amount*((l.total_payable-l.amount)/NULLIF(l.total_payable,0))),0) AS total
        FROM loan_repayments r JOIN loans l ON l.id=r.loan_id WHERE r.cycle_id=$1`,[cycleId]),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM group_expenses
        WHERE cycle_id=$1 AND status='approved'`,[cycleId]),
    ]);
    const approved=manual.rows.filter(item=>item.status==='approved');
    const serviceCharges=approved.filter(item=>item.category==='service_charge').reduce((sum,item)=>sum+Number(item.amount),0);
    const other=approved.filter(item=>item.category==='other').reduce((sum,item)=>sum+Number(item.amount),0);
    const fineTotal=Number(fines.rows[0].total);const interestTotal=Number(interest.rows[0].total);const expenseTotal=Number(expenses.rows[0].total);
    const totalIncome=fineTotal+interestTotal+serviceCharges+other;
    return {cycle:cycle.rows[0],records:manual.rows,summary:{fines:fineTotal,loan_interest:interestTotal,
      service_charges:serviceCharges,other,total_income:totalIncome,expenses:expenseTotal,profit:totalIncome-expenseTotal}};
  }

  static async create(data){
    const client=await pool.connect();try{await client.query('BEGIN');
      const result=await client.query(`INSERT INTO group_income
        (category,amount,payer,description,reference,income_date,requested_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[data.category,data.amount,data.payer||null,
          data.description,data.reference||null,data.income_date,data.requested_by]);
      const item=result.rows[0];const approval=await Approval.create({action_type:'other_income',entity_id:item.id,
        payload:{amount:data.amount,description:data.description,reference:data.reference||null,
          member_id:null,cycle_id:item.cycle_id,category:data.category},
        reason:`${data.category.replaceAll('_',' ')}: ${data.description}`,requested_by:data.requested_by},client);
      await client.query('UPDATE group_income SET approval_request_id=$2 WHERE id=$1',[item.id,approval.id]);
      await client.query('COMMIT');return {...item,approval_request_id:approval.id};
    }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}
}
