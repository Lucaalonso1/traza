import { route, requireUser, one, exec } from "@/lib/server/auth";

export const POST = route(async (req, { params }) => {
  const u = await requireUser();
  const id = Number((await params).id);
  const had = await one("SELECT 1 x FROM me_gusta WHERE usuario_id = ? AND publicacion_id = ?", [u.id, id]);
  if (had) await exec("DELETE FROM me_gusta WHERE usuario_id = ? AND publicacion_id = ?", [u.id, id]);
  else await exec("INSERT IGNORE INTO me_gusta (usuario_id, publicacion_id) VALUES (?, ?)", [u.id, id]);
  const c = await one("SELECT COUNT(*) n FROM me_gusta WHERE publicacion_id = ?", [id]);
  return Response.json({ liked: !had, likes: c.n });
});
