import { createHmac,randomUUID,timingSafeEqual } from "node:crypto";
import { pool,runWithOrganization } from "../config/database.js";
import { env } from "../config/env.js";

export const getPlans = async (req,res) => {
  const result=await pool.query(`SELECT id,code,name,description,price_tzs,billing_interval,member_limit,features
    FROM plans WHERE is_active=TRUE ORDER BY sort_order`);
  res.json({success:true,data:result.rows});
};

export const getBillingOverview = async (req,res) => {
  const [subscription,invoices,payments]=await Promise.all([
    pool.query(`SELECT s.*,p.code AS plan_code,p.name AS plan_name,p.price_tzs,p.billing_interval,p.member_limit,p.features
      FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.organization_id=$1`,[req.organization.id]),
    pool.query("SELECT * FROM invoices WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 50",[req.organization.id]),
    pool.query("SELECT * FROM subscription_payments WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 50",[req.organization.id]),
  ]);
  const item=subscription.rows[0];
  const end=item.status==="trialing"?item.trial_ends_at:item.current_period_ends_at;
  const daysRemaining=end?Math.max(0,Math.ceil((new Date(end).getTime()-Date.now())/86400000)):0;
  res.json({success:true,data:{organization:req.organization,membership:req.organizationMembership,subscription:{...item,days_remaining:daysRemaining,read_only:!["trialing","active","grace_period"].includes(item.status)},invoices:invoices.rows,payments:payments.rows}});
};

export const createCheckout = async (req,res) => {
  const planId=Number(req.body.plan_id);
  const plan=(await pool.query("SELECT * FROM plans WHERE id=$1 AND is_active=TRUE",[planId])).rows[0];
  if(!plan) return res.status(404).json({success:false,message:"Plan not found"});
  const client=await pool.connect();
  let invoice; let payment;
  try {
    await client.query("BEGIN");
    const subscription=(await client.query("SELECT * FROM subscriptions WHERE organization_id=$1 FOR UPDATE",[req.organization.id])).rows[0];
    if(!subscription) { await client.query("ROLLBACK"); return res.status(409).json({success:false,message:"Subscription is not configured"}); }
    const invoiceNumber=`INV-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${randomUUID().slice(0,8).toUpperCase()}`;
    invoice=(await client.query(`INSERT INTO invoices(organization_id,subscription_id,plan_id,invoice_number,amount_tzs,due_at)
      VALUES($1,$2,$3,$4,$5,NOW()+INTERVAL '24 hours') RETURNING *`,[req.organization.id,subscription.id,plan.id,invoiceNumber,plan.price_tzs])).rows[0];
    const reference=`VKB-${req.organization.id}-${randomUUID().replaceAll("-","").slice(0,16).toUpperCase()}`;
    payment=(await client.query(`INSERT INTO subscription_payments(organization_id,invoice_id,provider,reference,amount_tzs)
      VALUES($1,$2,$3,$4,$5) RETURNING *`,[req.organization.id,invoice.id,env.billing.provider,reference,plan.price_tzs])).rows[0];
    await client.query("COMMIT");
  } catch(error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
  const checkoutUrl=env.billing.checkoutUrl
    ? `${env.billing.checkoutUrl}${env.billing.checkoutUrl.includes("?")?"&":"?"}reference=${encodeURIComponent(payment.reference)}&amount=${plan.price_tzs}&organization_id=${req.organization.id}`
    : null;
  res.status(201).json({success:true,message:"Payment request created",data:{invoice,payment,checkout_url:checkoutUrl}});
};

const applyVerifiedPayment = async (organizationId,data,event) => runWithOrganization(
  {organizationId},
  async () => {
    const client=await pool.connect();
    try {
      await client.query("BEGIN");
      const payment=(await client.query(`SELECT sp.*,i.subscription_id,i.plan_id,i.amount_tzs AS invoice_amount
        FROM subscription_payments sp JOIN invoices i ON i.id=sp.invoice_id
        WHERE sp.organization_id=$1 AND sp.reference=$2 FOR UPDATE OF sp,i`,[organizationId,String(data.reference)])).rows[0];
      if(!payment) throw new Error("Unknown payment reference");
      const amount=Number(data.amount);
      if(!Number.isSafeInteger(amount)||amount<=0||amount!==Number(payment.amount_tzs)||amount!==Number(payment.invoice_amount)) {
        throw new Error("Payment amount mismatch");
      }
      if(payment.status==="paid") { await client.query("COMMIT"); return; }
      if(data.status!=="paid") {
        await client.query(`UPDATE subscription_payments SET status=CASE WHEN $1='failed' THEN 'failed' ELSE status END,
          provider_payment_id=COALESCE($2,provider_payment_id),provider_payload=$3,updated_at=NOW() WHERE id=$4`,
        [data.status,data.provider_payment_id||null,event,payment.id]);
        await client.query("COMMIT"); return;
      }
      const plan=(await client.query("SELECT billing_interval FROM plans WHERE id=$1 AND is_active=TRUE",[payment.plan_id])).rows[0];
      if(!plan) throw new Error("Invoice plan is unavailable");
      const interval=plan.billing_interval==="year"?"1 year":"1 month";
      await client.query(`UPDATE subscription_payments SET status='paid',provider_payment_id=$1,payment_method=$2,
        provider_payload=$3,paid_at=NOW(),updated_at=NOW() WHERE id=$4`,
      [data.provider_payment_id||null,data.payment_method||null,event,payment.id]);
      await client.query("UPDATE invoices SET status='paid',paid_at=NOW() WHERE id=$1",[payment.invoice_id]);
      await client.query(`UPDATE subscriptions SET plan_id=$1,status='active',current_period_started_at=NOW(),
        current_period_ends_at=NOW()+$2::interval,trial_ends_at=LEAST(COALESCE(trial_ends_at,NOW()),NOW()),
        grace_ends_at=NULL,cancel_at_period_end=FALSE,updated_at=NOW() WHERE id=$3`,
      [payment.plan_id,interval,payment.subscription_id]);
      await client.query("COMMIT");
    } catch(error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  },
);

const verifySignature = (rawBody,header) => {
  if(!env.billing.webhookSecret||!rawBody||!header) return false;
  const fields=Object.fromEntries(header.split(",").map(part=>part.split("=").map(value=>value.trim())));
  const timestamp=Number(fields.t); const received=fields.v1;
  if(!timestamp||!received||Math.abs(Date.now()/1000-timestamp)>env.billing.webhookToleranceSeconds) return false;
  const expected=createHmac("sha256",env.billing.webhookSecret).update(`${timestamp}.`).update(rawBody).digest("hex");
  const left=Buffer.from(received,"hex");const right=Buffer.from(expected,"hex");
  return left.length===right.length&&timingSafeEqual(left,right);
};

export const billingWebhook = async (req,res) => {
  const valid=verifySignature(req.rawBody,req.headers["x-billing-signature"]);
  if(!valid) return res.status(401).json({success:false,message:"Invalid webhook signature"});
  const event=req.body; const eventId=String(event.id||""); const type=String(event.type||"");
  if(!eventId||!type) return res.status(400).json({success:false,message:"Invalid webhook event"});
  let eventRecord=(await pool.query(`INSERT INTO billing_webhook_events(provider,provider_event_id,event_type,payload,signature_valid)
    VALUES($1,$2,$3,$4,TRUE) ON CONFLICT(provider,provider_event_id) DO NOTHING RETURNING id`,[env.billing.provider,eventId,type,event]));
  if(!eventRecord.rowCount) {
    eventRecord=await pool.query(`SELECT id,processed_at FROM billing_webhook_events
      WHERE provider=$1 AND provider_event_id=$2`,[env.billing.provider,eventId]);
    if(eventRecord.rows[0]?.processed_at) return res.json({success:true,message:"Event already processed"});
  }
  const webhookEventId=eventRecord.rows[0]?.id;
  if(!webhookEventId) return res.status(409).json({success:false,message:"Webhook event is currently being recorded"});
  try {
    const data=event.data||{};
    const organizationId=Number(data.organization_id);
    if(!Number.isSafeInteger(organizationId)||organizationId<=0||!data.reference||!["paid","failed","pending"].includes(data.status)) {
      throw new Error("Invalid payment event data");
    }
    await applyVerifiedPayment(organizationId,data,event);
    await pool.query("UPDATE billing_webhook_events SET processed_at=NOW(),processing_error=NULL WHERE id=$1",[webhookEventId]);
    return res.json({success:true});
  } catch(error) {
    await pool.query("UPDATE billing_webhook_events SET processing_error=$1 WHERE id=$2",[error.message,webhookEventId]);
    return res.status(400).json({success:false,message:"Webhook could not be applied"});
  }
};

export const cancelSubscription = async (req,res) => {
  const result=await pool.query(`UPDATE subscriptions SET cancel_at_period_end=TRUE,updated_at=NOW()
    WHERE organization_id=$1 AND status IN ('active','grace_period') RETURNING *`,[req.organization.id]);
  if(!result.rowCount) return res.status(409).json({success:false,message:"There is no renewable active subscription"});
  res.json({success:true,message:"Subscription will cancel at the end of the current period",data:result.rows[0]});
};
