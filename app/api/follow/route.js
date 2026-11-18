import { route, requireUser, body, HttpError, one, exec } from "@/lib/server/auth";

export const POST = route(async (req) => {
  const u = await requireUser();
  const other = await one("SELECT id FROM usuarios WHERE username = ?", [String((await body(req)).username ?? "")]);
  if (!other) throw new HttpError(404, "Ese usuario no existe.");
  if (other.id === u.id) throw new HttpError(400, "No puedes seguirte a ti mismo.");
  const had = await one("SELECT 1 x FROM seguimientos WHERE seguidor_id = ? AND seguido_id = ?", [u.id, other.id]);
  if (had) await exec("DELETE FROM seguimientos WHERE seguidor_id = ? AND seguido_id = ?", [u.id, other.id]);
  else await exec("INSERT IGNORE INTO seguimientos (seguidor_id, seguido_id) VALUES (?, ?)", [u.id, other.id]);
  const c = await one("SELECT COUNT(*) n FROM seguimientos WHERE seguido_id = ?", [other.id]);
  return Response.json({ following: !had, seguidores: c.n });
});
