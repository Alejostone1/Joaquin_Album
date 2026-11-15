import type { PoolConfig } from "pg";

/**
 * Configuración de conexión compartida por la app y los scripts.
 * - DATABASE_SSL=true  → TLS (necesario con Supabase / bases en la nube)
 * - DB_SCHEMA=joaquin  → todas las tablas viven en ese esquema (aislado)
 */
export function poolConfig(max = 10): PoolConfig {
  let connectionString = process.env.DATABASE_URL ?? "";
  const ssl = process.env.DATABASE_SSL === "true" || /supabase\.(co|com)/.test(connectionString);
  if (ssl) connectionString = connectionString.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
  return {
    connectionString,
    max,
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
    idleTimeoutMillis: 10_000,
  };
}

export const DB_SCHEMA = process.env.DB_SCHEMA || "";
