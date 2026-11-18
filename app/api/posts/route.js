import { route, requireUser, HttpError, one, exec } from "@/lib/server/auth";
import { saveUpload } from "@/lib/server/uploads";

// Publicar un clip o una foto (multipart/form-data)
export const POST = route(async (req) => {
  const u = await requireUser();
  const form = await req.formData().catch(() => null);
  if (!form) throw new HttpError(400, "No he podido leer la publicación.");
  const texto = String(form.get("texto") ?? "").trim().slice(0, 1000);
  const estacionId = Number(form.get("estacion")) || null;
  const spotId = Number(form.get("spot")) || null;
  const files = form.getAll("archivo").filter((f) => typeof f === "object" && f.size > 0).slice(0, 4);
  if (!files.length) throw new HttpError(400, "Añade un clip o una foto.");
  if (estacionId && !(await one("SELECT id FROM estaciones WHERE id = ?", [estacionId]))) throw new HttpError(400, "Esa estación no existe.");
  const saved = [];
  for (const f of files) saved.push(await saveUpload(f));
  const tipo = saved.some((m) => m.tipo === "video") ? "clip" : "foto";
  const res = await exec("INSERT INTO publicaciones (autor_id, estacion_id, spot_id, tipo, texto) VALUES (?, ?, ?, ?, ?)", [
    u.id, estacionId, spotId, tipo, texto,
  ]);
  for (const [i, m] of saved.entries())
    await exec("INSERT INTO medios (publicacion_id, tipo, url, orden) VALUES (?, ?, ?, ?)", [res.insertId, m.tipo, m.url, i]);
  return Response.json({ id: res.insertId });
});
