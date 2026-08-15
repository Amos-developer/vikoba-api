import { pool } from "../config/database.js";

const requiredTables=["members","transactions","schema_migrations","organizations","plans","subscriptions","invoices","subscription_payments"];

try {
  const connection=await pool.query(`SELECT current_database() AS database,current_user AS role,
    inet_server_addr() AS server,inet_server_port() AS port,r.rolsuper,r.rolbypassrls,
    (SELECT tableowner FROM pg_tables WHERE schemaname='public' AND tablename='transactions') AS transactions_owner
    FROM pg_roles r WHERE r.rolname=current_user`);
  const tables=await pool.query(`SELECT name,to_regclass('public.'||name) IS NOT NULL AS exists
    FROM unnest($1::text[]) AS name`,[requiredTables]);
  const migration=await pool.query(`SELECT EXISTS(
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='schema_migrations'
  ) AS has_migrations_table`);
  let billingMigration=false;
  if(migration.rows[0].has_migrations_table) {
    billingMigration=(await pool.query("SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename=$1) AS applied",["019_create_multitenancy_and_billing.sql"])).rows[0].applied;
  }
  console.log(JSON.stringify({connection:connection.rows[0],tables:Object.fromEntries(tables.rows.map(row=>[row.name,row.exists])),billingMigration},null,2));
} catch(error) {
  console.error(`Unable to inspect database schema: ${error.message}`);
  process.exitCode=1;
} finally { await pool.end(); }
