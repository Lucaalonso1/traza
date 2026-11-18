import { route, body, HttpError, checkPassword, startSession, one } from "@/lib/server/auth";

export const POST = route(async (req) => {
  const b = await body(req);
  const id = String(b.email ?? "").trim().toLowerCase();
  const u = await one("SELECT id, pass_hash FROM usuarios WHERE email = :id OR username = :id", { id });
  if (!u || !(await checkPassword(String(b.password ?? ""), u.pass_hash)))
    throw new HttpError(401, "El correo o la contraseña no coinciden.");
  await startSession(u.id);
  return Response.json({ ok: true });
});
