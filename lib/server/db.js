import "server-only";
import mysql from "mysql2/promise";

// Un único pool por proceso (en desarrollo Next recarga módulos: lo guardamos en globalThis)
const g = globalThis;
export const pool =
  g.__trazaPool ??
  (g.__trazaPool = mysql.createPool({
    uri: process.env.DATABASE_URL || "mysql://traza:traza_dev@127.0.0.1:3307/traza",
    connectionLimit: 10,
    namedPlaceholders: true,
    dateStrings: true,
    supportBigNumbers: true,
    decimalNumbers: true,
  }));

export async function q(sql, params = {}) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function one(sql, params = {}) {
  const rows = await q(sql, params);
  return rows[0] ?? null;
}

export async function exec(sql, params = {}) {
  const [res] = await pool.execute(sql, params);
  return res;
}
