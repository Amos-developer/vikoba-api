import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";

import { env } from "./env.js";

const { Pool } = pg;

const rawPool = new Pool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

rawPool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export const organizationContext = new AsyncLocalStorage();
export const runWithOrganization = (context, callback) => organizationContext.run(context, callback);

const setOrganization = (client, organizationId) => client.query(
  "SELECT set_config('app.organization_id',$1,true)",
  [String(organizationId)],
);

const queryWithContext = async (...args) => {
  const context = organizationContext.getStore();
  if (!context?.organizationId) return rawPool.query(...args);
  const client = await rawPool.connect();
  try {
    await client.query("BEGIN");
    await setOrganization(client, context.organizationId);
    const result = await client.query(...args);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const connectWithContext = async () => {
  const client = await rawPool.connect();
  const context = organizationContext.getStore();
  if (!context?.organizationId) return client;
  let configured = false;
  const originalQuery = client.query.bind(client);
  client.query = async (...args) => {
    const sql = typeof args[0] === "string" ? args[0] : args[0]?.text || "";
    const command = sql.trim().split(/\s+/,1)[0].toUpperCase();
    if (command === "BEGIN") {
      const result = await originalQuery(...args);
      await setOrganization({ query: originalQuery }, context.organizationId);
      configured = true;
      return result;
    }
    if (["COMMIT","ROLLBACK"].includes(command)) {
      const result = await originalQuery(...args);
      configured = false;
      return result;
    }
    if (!configured) throw new Error("Tenant-scoped clients must begin a transaction before querying");
    return originalQuery(...args);
  };
  return client;
};

export const pool = {
  query: queryWithContext,
  connect: connectWithContext,
  end: (...args) => rawPool.end(...args),
  on: (...args) => rawPool.on(...args),
};

export const connectToDatabase = async () => {
  const role = await rawPool.query(`SELECT current_user AS name, r.rolsuper, r.rolbypassrls
    FROM pg_roles r WHERE r.rolname = current_user`);
  if (role.rows[0]?.rolsuper || role.rows[0]?.rolbypassrls) {
    throw new Error(
      "Unsafe DB_USER: the API must use a non-superuser role without BYPASSRLS. " +
      "Use the table-owner account only with npm run db:migrate.",
    );
  }
  console.log("PostgreSQL database connected");
};

export const disconnectFromDatabase = async () => {
  await pool.end();
};
