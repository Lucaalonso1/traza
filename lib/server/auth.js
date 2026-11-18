import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { q, one, exec } from "./db";

const COOKIE = "traza_session";
const DAYS = 30;
const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");

export const PUBLIC_USER = `u.id, u.username, u.nombre, u.bio, u.color, u.avatar_url AS avatar, u.altura_cm, u.peso_kg, u.nivel, u.estilo, u.estacion_casa`;

export async function hashPassword(p) {
  return bcrypt.hash(p, 10);
}
export async function checkPassword(p, h) {
  return bcrypt.compare(p, h);
}

export async function startSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  await exec("INSERT INTO sesiones (token_hash, usuario_id, expira_en) VALUES (?, ?, NOW() + INTERVAL ? DAY)", [sha(token), userId, DAYS]);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DAYS * 86400,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await exec("DELETE FROM sesiones WHERE token_hash = ?", [sha(token)]);
  jar.delete(COOKIE);
}

/** Usuario de la sesión actual o null. */
export async function currentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return one(
    `SELECT ${PUBLIC_USER}, u.email FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = :h AND s.expira_en > NOW()`,
    { h: sha(token) }
  );
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "Inicia sesión para continuar.");
  return u;
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Envuelve un handler de ruta: convierte HttpError en respuesta JSON. */
export function route(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      if (e?.code === "ECONNREFUSED")
        return Response.json({ error: "La base de datos no está disponible. Arranca MySQL con `npm run db:up`." }, { status: 503 });
      console.error(e);
      return Response.json({ error: "Algo ha fallado en el servidor. Vuelve a intentarlo." }, { status: 500 });
    }
  };
}

export async function body(req) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "No he podido leer los datos enviados.");
  }
}

export { q, one, exec };
