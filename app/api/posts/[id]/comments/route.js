import { route, requireUser, body, HttpError, one, exec } from "@/lib/server/auth";

export const POST = route(async (req, { params }) => {
  const u = await requireUser();
  const id = Number((await params).id);
  const texto = String((await body(req)).texto ?? "").trim();
  if (!texto) throw new HttpError(400, "Escribe un comentario antes de enviarlo.");
  if (!(await one("SELECT id FROM publicaciones WHERE id = ?", [id]))) throw new HttpError(404, "Esa publicación ya no existe.");
  const r = await exec("INSERT INTO comentarios (publicacion_id, autor_id, texto) VALUES (?, ?, ?)", [id, u.id, texto.slice(0, 500)]);
  return Response.json({ comment: { id: r.insertId, texto: texto.slice(0, 500), username: u.username, nombre: u.nombre, color: u.color, avatar: u.avatar, creadoEn: new Date().toISOString() } });
});
