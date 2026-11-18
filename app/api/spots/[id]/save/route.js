import { route, requireUser, one, exec } from "@/lib/server/auth";

export const POST = route(async (req, { params }) => {
  const u = await requireUser();
  const id = Number((await params).id);
  const had = await one("SELECT 1 x FROM guardados WHERE usuario_id = ? AND spot_id = ?", [u.id, id]);
  if (had) await exec("DELETE FROM guardados WHERE usuario_id = ? AND spot_id = ?", [u.id, id]);
  else await exec("INSERT IGNORE INTO guardados (usuario_id, spot_id) VALUES (?, ?)", [u.id, id]);
  return Response.json({ saved: !had });
});
