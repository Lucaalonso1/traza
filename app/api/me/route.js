import { route, requireUser, body, HttpError, one, exec } from "@/lib/server/auth";
import { STYLES } from "@/lib/catalog";

// Actualizar el perfil: datos públicos y físico (lo usan el recomendador y los gemelos de nieve)
export const PATCH = route(async (req) => {
  const u = await requireUser();
  const b = await body(req);
  const nombre = String(b.nombre ?? "").trim();
  if (nombre.length < 2) throw new HttpError(400, "Dinos cómo te llamas.");
  const num = (v, lo, hi) => (v === "" || v == null ? null : Number.isFinite(+v) && +v >= lo && +v <= hi ? Math.round(+v) : NaN);
  const altura = num(b.altura, 120, 220);
  const peso = num(b.peso, 30, 160);
  const nivel = num(b.nivel, 0, 3);
  if (Number.isNaN(altura)) throw new HttpError(400, "La altura debe estar entre 120 y 220 cm.");
  if (Number.isNaN(peso)) throw new HttpError(400, "El peso debe estar entre 30 y 160 kg.");
  if (Number.isNaN(nivel)) throw new HttpError(400, "Elige un nivel válido.");
  const estilo = b.estilo && STYLES[b.estilo] ? b.estilo : null;
  const casa = b.casa ? (await one("SELECT id FROM estaciones WHERE id = ?", [Number(b.casa)]))?.id ?? null : null;
  await exec(
    "UPDATE usuarios SET nombre = ?, bio = ?, altura_cm = ?, peso_kg = ?, nivel = ?, estilo = ?, estacion_casa = ? WHERE id = ?",
    [nombre.slice(0, 80), String(b.bio ?? "").trim().slice(0, 280) || null, altura, peso, nivel, estilo, casa, u.id]
  );
  return Response.json({ ok: true });
});
