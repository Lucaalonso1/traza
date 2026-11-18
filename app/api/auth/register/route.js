import { route, body, HttpError, hashPassword, startSession, one, exec } from "@/lib/server/auth";

const COLORS = ["#f2774a", "#7d9db3", "#e8b04a", "#6fb39a", "#b48ad6", "#5aa0d8", "#d97a9b"];

export const POST = route(async (req) => {
  const b = await body(req);
  const nombre = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const username = String(b.username ?? "").trim().toLowerCase();
  if (nombre.length < 2) throw new HttpError(400, "Dinos cómo te llamas.");
  if (!/^[a-z0-9._]{3,30}$/.test(username))
    throw new HttpError(400, "El usuario debe tener entre 3 y 30 caracteres: letras, números, punto o guion bajo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Escribe un correo válido, por ejemplo nombre@correo.com.");
  if (password.length < 8) throw new HttpError(400, "La contraseña necesita al menos 8 caracteres.");
  const clash = await one("SELECT email = :e AS mail FROM usuarios WHERE email = :e OR username = :u LIMIT 1", { e: email, u: username });
  if (clash) throw new HttpError(409, clash.mail ? "Ya existe una cuenta con ese correo. Inicia sesión." : "Ese nombre de usuario ya está cogido. Prueba otro.");
  const res = await exec(
    "INSERT INTO usuarios (username, nombre, email, pass_hash, color) VALUES (?, ?, ?, ?, ?)",
    [username, nombre, email, await hashPassword(password), COLORS[Math.floor(Math.random() * COLORS.length)]]
  );
  await startSession(res.insertId);
  return Response.json({ ok: true });
});
