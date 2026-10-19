import { Pool, PoolClient, QueryResult, QueryResultRow, types } from "pg";
import { env } from "../config/env";

// 1700 es el OID de NUMERIC/DECIMAL en PostgreSQL
types.setTypeParser(1700, (val: string) => parseFloat(val));
// 20 es el OID de INT8/BIGINT en PostgreSQL
types.setTypeParser(20, (val: string) => parseInt(val, 10));

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl:
    env.DATABASE_URL.includes("supabase") || env.DATABASE_URL.includes("amazonaws.com")
      ? { rejectUnauthorized: false }
      : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("[Database] Error inesperado en el cliente del pool de PostgreSQL:", err);
});

/**
 * Ejecutor de consultas generales (públicas o de autenticación inicial previa a conocer el tenant)
 */
export async function query<R extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<R>> {
  const start = Date.now();
  const res = await pool.query<R>(text, params);
  const duration = Date.now() - start;
  if (env.NODE_ENV === "development") {
    console.log(`[SQL Query] (${duration}ms): ${text.replace(/\s+/g, " ").slice(0, 100)}...`);
  }
  return res;
}

/**
 * Ejecutor de consultas con CONTEXTO MULTI-TENANT OBLIGATORIO (Row-Level Security)
 * Inyecta SET LOCAL app.current_tenant_id = <tenantId> dentro de una transacción.
 * El motor de PostgreSQL filtrará automáticamente las filas por dicho tenant.
 */
export async function withTenantContext<T>(
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN;");
    // set_config permite pasar el UUID del tenant parametrizado ($1) con is_local = true
    await client.query("SELECT set_config('app.current_tenant_id', $1, true);", [tenantId]);
    const result = await callback(client);
    await client.query("COMMIT;");
    return result;
  } catch (error) {
    await client.query("ROLLBACK;");
    throw error;
  } finally {
    client.release();
  }
}
