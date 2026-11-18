import { route, requireUser, body, HttpError, one, exec, currentUser } from "@/lib/server/auth";
import { spots, stations } from "@/lib/server/queries";

const DIFF = ["roja", "negra", "doble_negra", "alpina"];
const ORI = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

// Todo lo que pinta el mapa
export const GET = route(async () => {
  const u = await currentUser();
  return Response.json({ stations: await stations(), spots: await spots({ viewer: u?.id ?? 0 }) });
});

// Crear un spot (punto) o una ruta (línea) dibujada en el mapa o importada de GPX
export const POST = route(async (req) => {
  const u = await requireUser();
  const b = await body(req);
  const nombre = String(b.nombre ?? "").trim();
  const descripcion = String(b.descripcion ?? "").trim();
  const est = await one("SELECT id FROM estaciones WHERE id = ?", [Number(b.estacion)]);
  const coords = Array.isArray(b.coords) ? b.coords.filter((c) => Array.isArray(c) && c.length === 2 && c.every(Number.isFinite)) : [];
  if (nombre.length < 3) throw new HttpError(400, "Ponle un nombre al spot.");
  if (!est) throw new HttpError(400, "Elige la estación más cercana.");
  if (!DIFF.includes(b.dificultad)) throw new HttpError(400, "Elige la dificultad.");
  if (!ORI.includes(b.orientacion)) throw new HttpError(400, "Elige la orientación.");
  if (descripcion.length < 10) throw new HttpError(400, "Describe la línea en al menos una frase.");
  if (!coords.length) throw new HttpError(400, "Marca el spot o dibuja la ruta en el mapa.");
  if (coords.some(([lng, lat]) => Math.abs(lat) > 90 || Math.abs(lng) > 180)) throw new HttpError(400, "Hay coordenadas fuera de rango.");
  const isLine = coords.length > 1;
  const wkt = isLine
    ? `LINESTRING(${coords.slice(0, 500).map(([lng, lat]) => `${lng} ${lat}`).join(", ")})`
    : `POINT(${coords[0][0]} ${coords[0][1]})`;
  const desnivel = Number(b.desnivel) > 0 ? Math.min(5000, Math.round(Number(b.desnivel))) : null;
  const r = await exec(
    `INSERT INTO spots (estacion_id, autor_id, nombre, tipo, descripcion, dificultad, orientacion, desnivel_m, geom)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ST_GeomFromText(?, 4326, 'axis-order=long-lat'))`,
    [est.id, u.id, nombre.slice(0, 90), isLine ? "ruta" : "spot", descripcion.slice(0, 2000), b.dificultad, b.orientacion, desnivel, wkt]
  );
  await exec("INSERT INTO publicaciones (autor_id, estacion_id, spot_id, tipo, texto) VALUES (?, ?, ?, 'ruta', ?)", [
    u.id, est.id, r.insertId, `Nuevo ${isLine ? "ruta" : "spot"}: ${nombre}. ${descripcion}`.slice(0, 1000),
  ]);
  return Response.json({ id: r.insertId });
});
