import { route, body, requireUser, HttpError, one, exec } from "@/lib/server/auth";

const key = (s) => `${s.marca}-${s.modelo}`.toLowerCase().replace(/\s+/g, "-").slice(0, 120);

// Guardar un esquí recomendado
export const POST = route(async (req) => {
  const u = await requireUser();
  const { ski, profile } = await body(req);
  if (!ski?.marca || !ski?.modelo) throw new HttpError(400, "Falta el esquí que quieres guardar.");
  const cat = await one("SELECT id FROM esquis WHERE marca = :m AND modelo = :o", { m: ski.marca, o: ski.modelo });
  await exec(
    `INSERT INTO garaje (usuario_id, esqui_id, clave, marca, modelo, categoria, longitud_cm, patin_mm, radio_m, encaje, por_que, perfil)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE encaje = VALUES(encaje)`,
    [u.id, cat?.id ?? null, key(ski), ski.marca, ski.modelo, ski.categoria ?? "", Math.round(ski.longitudCm) || 0,
     Math.round(ski.patinMm) || 0, Number(ski.radioM) || 0, Math.round(ski.encaje) || 0, String(ski.porQue ?? "").slice(0, 600),
     profile ? JSON.stringify(profile) : null]
  );
  return Response.json({ ok: true });
});

// Editar la nota de un esquí guardado
export const PATCH = route(async (req) => {
  const u = await requireUser();
  const { id, note } = await body(req);
  await exec("UPDATE garaje SET nota = ? WHERE id = ? AND usuario_id = ?", [String(note ?? "").slice(0, 200), id, u.id]);
  return Response.json({ ok: true });
});

// Quitar del garaje
export const DELETE = route(async (req) => {
  const u = await requireUser();
  const id = Number(new URL(req.url).searchParams.get("id"));
  await exec("DELETE FROM garaje WHERE id = ? AND usuario_id = ?", [id, u.id]);
  return Response.json({ ok: true });
});
