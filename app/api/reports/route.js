import { route, requireUser, body, HttpError, one, exec } from "@/lib/server/auth";

const NIEVES = ["polvo", "dura", "primavera", "hielo", "costra", "venteada"];

// Informe de nieve del día: se guarda y aparece también en el feed
export const POST = route(async (req) => {
  const u = await requireUser();
  const b = await body(req);
  const est = await one("SELECT id, nombre FROM estaciones WHERE id = ?", [Number(b.estacion)]);
  if (!est) throw new HttpError(400, "Elige la estación.");
  if (!NIEVES.includes(b.nieve)) throw new HttpError(400, "Elige el tipo de nieve.");
  const calidad = Math.round(Number(b.calidad));
  if (!(calidad >= 1 && calidad <= 5)) throw new HttpError(400, "Puntúa la nieve del 1 al 5.");
  const nota = String(b.nota ?? "").trim().slice(0, 280);
  await exec("INSERT INTO informes_nieve (estacion_id, autor_id, fecha, tipo_nieve, calidad, nota) VALUES (?, ?, CURDATE(), ?, ?, ?)", [
    est.id, u.id, b.nieve, calidad, nota,
  ]);
  const r = await exec("INSERT INTO publicaciones (autor_id, estacion_id, tipo, texto) VALUES (?, ?, 'informe', ?)", [
    u.id, est.id, `Nieve ${b.nieve} · ${calidad}/5${nota ? ` — ${nota}` : ""}`,
  ]);
  return Response.json({ ok: true, id: r.insertId });
});
