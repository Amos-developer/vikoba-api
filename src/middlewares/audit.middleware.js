import { pool } from "../config/database.js";

const sensitiveKeys=new Set(['password','token','authorization','jwt_secret','db_password']);
const sanitize=(value,depth=0)=>{
  if(depth>3)return '[truncated]';
  if(Array.isArray(value))return value.slice(0,25).map(item=>sanitize(item,depth+1));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[
    key,sensitiveKeys.has(key.toLowerCase())?'[redacted]':sanitize(item,depth+1),
  ]));
  return typeof value==='string'&&value.length>500?`${value.slice(0,500)}…`:value;
};
const describe=(req,segments)=>{
  const path=req.originalUrl.toLowerCase();
  if(path.includes('/review'))return req.body?.decision==='approved'?'approved':'rejected';
  if(path.includes('/reverse'))return 'reversed';
  if(path.includes('/activate'))return 'activated';
  if(path.includes('/close'))return 'closing_prepared';
  if(path.includes('/request-payment'))return 'payout_requested';
  if(req.method==='POST')return 'created';
  if(['PATCH','PUT'].includes(req.method))return 'updated';
  if(req.method==='DELETE')return 'deleted';
  return req.method.toLowerCase();
};

export const auditTrail=(req,res,next)=>{
  if(!['POST','PATCH','PUT','DELETE'].includes(req.method))return next();
  let responseData=null;const originalJson=res.json.bind(res);
  res.json=(body)=>{responseData=body;return originalJson(body);};
  res.on('finish',()=>{
    if(!req.user?.userId)return;
    const segments=req.path.split('/').filter(Boolean);
    const entityType=segments[1]||segments[0]||'unknown';
    const pathId=segments.find((part,index)=>index>1&&/^\d+$/.test(part));
    const responseId=responseData?.data?.id;
    const details=sanitize({request:req.body||{},message:responseData?.message||null});
    pool.query(`INSERT INTO audit_logs
      (user_id,session_id,action,entity_type,entity_id,method,path,outcome,status_code,details,ip_address,user_agent)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12)`,[
      req.user.userId,req.user.sid||null,describe(req,segments),entityType,
      String(responseId||pathId||'')||null,req.method,req.originalUrl,
      res.statusCode<400?'success':'failed',res.statusCode,JSON.stringify(details),
      req.ip,req.get('user-agent')||null,
    ]).catch(error=>console.error('Unable to write audit log:',error.message));
  });
  next();
};
