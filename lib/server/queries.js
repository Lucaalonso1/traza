import "server-only";
import { q, one } from "./db";

// ── Publicaciones ───────────────────────────────────────────────────────────
const POST_SELECT = `
  p.id, p.tipo, p.texto, p.creado_en AS creadoEn,
  u.id AS autorId, u.username, u.nombre, u.color, u.avatar_url AS avatar,
  e.slug AS estacionSlug, e.nombre AS estacion,
  s.id AS spotId, s.nombre AS spot,
  (SELECT COUNT(*) FROM me_gusta m WHERE m.publicacion_id = p.id) AS likes,
  (SELECT COUNT(*) FROM comentarios c WHERE c.publicacion_id = p.id) AS comentarios,
  EXISTS(SELECT 1 FROM me_gusta m WHERE m.publicacion_id = p.id AND m.usuario_id = :viewer) AS liked,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('tipo', md.tipo, 'url', md.url, 'poster', md.poster_url))
     FROM medios md WHERE md.publicacion_id = p.id) AS medios`;
const POST_FROM = `
  FROM publicaciones p
  JOIN usuarios u ON u.id = p.autor_id
  LEFT JOIN estaciones e ON e.id = p.estacion_id
  LEFT JOIN spots s ON s.id = p.spot_id`;

const fixPost = (p) => ({ ...p, liked: !!p.liked, medios: p.medios ?? [] });

/** Feed: "todo" o solo de la gente que sigues (+ tus publicaciones). */
export async function feed({ viewer = 0, scope = "todo", limit = 30 } = {}) {
  const where = scope === "siguiendo"
    ? `WHERE p.autor_id = :viewer OR p.autor_id IN (SELECT seguido_id FROM seguimientos WHERE seguidor_id = :viewer)`
    : "";
  const rows = await q(`SELECT ${POST_SELECT} ${POST_FROM} ${where} ORDER BY p.creado_en DESC LIMIT ${Number(limit)}`, { viewer });
  return rows.map(fixPost);
}

export async function postsBy({ viewer = 0, autorId, estacionId, spotId, limit = 30 }) {
  const cond = autorId ? "p.autor_id = :id" : estacionId ? "p.estacion_id = :id" : "p.spot_id = :id";
  const rows = await q(`SELECT ${POST_SELECT} ${POST_FROM} WHERE ${cond} ORDER BY p.creado_en DESC LIMIT ${Number(limit)}`, {
    viewer,
    id: autorId ?? estacionId ?? spotId,
  });
  return rows.map(fixPost);
}

export async function post(id, viewer = 0) {
  const p = await one(`SELECT ${POST_SELECT} ${POST_FROM} WHERE p.id = :id`, { id, viewer });
  if (!p) return null;
  const comments = await q(
    `SELECT c.id, c.texto, c.creado_en AS creadoEn, u.username, u.nombre, u.color, u.avatar_url AS avatar
     FROM comentarios c JOIN usuarios u ON u.id = c.autor_id WHERE c.publicacion_id = :id ORDER BY c.creado_en`,
    { id }
  );
  return { ...fixPost(p), comments };
}

// ── Estaciones ──────────────────────────────────────────────────────────────
export async function stations() {
  return q(`
    SELECT e.id, e.slug, e.nombre, e.pais, e.region, e.cota_min AS cotaMin, e.cota_max AS cotaMax, e.km_pistas AS km,
           ST_Longitude(e.ubicacion) AS lng, ST_Latitude(e.ubicacion) AS lat,
           (SELECT COUNT(*) FROM spots s WHERE s.estacion_id = e.id) AS spots,
           (SELECT COUNT(*) FROM publicaciones p WHERE p.estacion_id = e.id) AS publicaciones,
           (SELECT i.tipo_nieve FROM informes_nieve i WHERE i.estacion_id = e.id ORDER BY i.fecha DESC, i.creado_en DESC LIMIT 1) AS nieve,
           (SELECT ROUND(AVG(i.calidad), 1) FROM informes_nieve i WHERE i.estacion_id = e.id AND i.fecha >= CURDATE() - INTERVAL 1 DAY) AS calidad
    FROM estaciones e ORDER BY publicaciones DESC, e.nombre`);
}

export async function station(slug) {
  return one(
    `SELECT e.id, e.slug, e.nombre, e.pais, e.region, e.cota_min AS cotaMin, e.cota_max AS cotaMax, e.km_pistas AS km,
            e.descripcion, e.boletin_url AS boletin, ST_Longitude(e.ubicacion) AS lng, ST_Latitude(e.ubicacion) AS lat
     FROM estaciones e WHERE e.slug = :slug`,
    { slug }
  );
}

export async function snowReports(estacionId, days = 3) {
  return q(
    `SELECT i.id, i.fecha, i.tipo_nieve AS nieve, i.calidad, i.nota, u.username, u.nombre, u.color, u.avatar_url AS avatar
     FROM informes_nieve i JOIN usuarios u ON u.id = i.autor_id
     WHERE i.estacion_id = :id AND i.fecha >= CURDATE() - INTERVAL :d DAY
     ORDER BY i.fecha DESC, i.creado_en DESC`,
    { id: estacionId, d: days }
  );
}

// ── Spots (geometría espacial → GeoJSON) ───────────────────────────────────
const SPOT_SELECT = `
  s.id, s.nombre, s.tipo, s.descripcion, s.dificultad, s.orientacion, s.desnivel_m AS desnivel, s.creado_en AS creadoEn,
  ST_AsGeoJSON(s.geom) AS geom,
  e.slug AS estacionSlug, e.nombre AS estacion, e.boletin_url AS boletin,
  u.username, u.nombre AS autor, u.color, u.avatar_url AS avatar,
  (SELECT COUNT(*) FROM guardados g WHERE g.spot_id = s.id) AS guardados,
  EXISTS(SELECT 1 FROM guardados g WHERE g.spot_id = s.id AND g.usuario_id = :viewer) AS saved`;
const SPOT_FROM = `FROM spots s JOIN estaciones e ON e.id = s.estacion_id JOIN usuarios u ON u.id = s.autor_id`;
// Punto de inicio de un spot (ruta → primer punto; spot → el propio punto)
const START = (a) => `IF(ST_GeometryType(${a}.geom) = 'POINT', ${a}.geom, ST_StartPoint(${a}.geom))`;
const fixSpot = (s) => ({ ...s, saved: !!s.saved, geom: typeof s.geom === "string" ? JSON.parse(s.geom) : s.geom });

export async function spots({ viewer = 0, estacionId } = {}) {
  const rows = await q(`SELECT ${SPOT_SELECT} ${SPOT_FROM} ${estacionId ? "WHERE s.estacion_id = :e" : ""} ORDER BY s.creado_en DESC`, {
    viewer,
    e: estacionId,
  });
  return rows.map(fixSpot);
}

export async function spot(id, viewer = 0) {
  const s = await one(`SELECT ${SPOT_SELECT} ${SPOT_FROM} WHERE s.id = :id`, { id, viewer });
  if (!s) return null;
  // Spots cercanos (consulta espacial: distancia sobre la esfera)
  const cercanos = await q(
    `SELECT o.id, o.nombre, o.dificultad, e.nombre AS estacion,
            ROUND(ST_Distance_Sphere(${START('o')}, ${START('s')}) / 1000, 1) AS km
     FROM spots s JOIN spots o ON o.id <> s.id JOIN estaciones e ON e.id = o.estacion_id
     WHERE s.id = :id AND ST_Distance_Sphere(${START('o')}, ${START('s')}) < 30000
     ORDER BY km LIMIT 4`,
    { id }
  );
  return { ...fixSpot(s), cercanos };
}

// ── Usuarios ────────────────────────────────────────────────────────────────
export async function profile(username, viewer = 0) {
  return one(
    `SELECT u.id, u.username, u.nombre, u.bio, u.color, u.avatar_url AS avatar, u.nivel, u.estilo, u.creado_en AS creadoEn,
            e.nombre AS casa, e.slug AS casaSlug,
            (SELECT COUNT(*) FROM seguimientos WHERE seguido_id = u.id) AS seguidores,
            (SELECT COUNT(*) FROM seguimientos WHERE seguidor_id = u.id) AS siguiendo,
            (SELECT COUNT(*) FROM publicaciones WHERE autor_id = u.id) AS publicaciones,
            (SELECT COUNT(*) FROM spots WHERE autor_id = u.id) AS spots,
            (SELECT COUNT(DISTINCT estacion_id) FROM publicaciones WHERE autor_id = u.id AND estacion_id IS NOT NULL) AS estaciones,
            EXISTS(SELECT 1 FROM seguimientos WHERE seguidor_id = :viewer AND seguido_id = u.id) AS sigo
     FROM usuarios u LEFT JOIN estaciones e ON e.id = u.estacion_casa WHERE u.username = :username`,
    { username, viewer }
  ).then((p) => (p ? { ...p, sigo: !!p.sigo } : null));
}

/** "Gemelos de nieve": esquiadores con físico, nivel y estilo parecidos. */
export async function twins(userId, limit = 4) {
  return q(
    `SELECT o.username, o.nombre, o.color, o.avatar_url AS avatar, o.estilo,
            ABS(CAST(o.altura_cm AS SIGNED) - CAST(me.altura_cm AS SIGNED)) + ABS(CAST(o.peso_kg AS SIGNED) - CAST(me.peso_kg AS SIGNED))
              + 8 * ABS(CAST(o.nivel AS SIGNED) - CAST(me.nivel AS SIGNED))
              + IF(o.estilo = me.estilo, 0, 10) AS distancia
     FROM usuarios me JOIN usuarios o ON o.id <> me.id
     WHERE me.id = :id AND me.altura_cm IS NOT NULL AND o.altura_cm IS NOT NULL
       AND o.id NOT IN (SELECT seguido_id FROM seguimientos WHERE seguidor_id = :id)
     ORDER BY distancia LIMIT ${Number(limit)}`,
    { id: userId }
  );
}

export async function suggestedUsers(viewer = 0, limit = 4) {
  return q(
    `SELECT u.username, u.nombre, u.color, u.avatar_url AS avatar, u.bio,
            (SELECT COUNT(*) FROM seguimientos WHERE seguido_id = u.id) AS seguidores
     FROM usuarios u
     WHERE u.id <> :viewer AND u.id NOT IN (SELECT seguido_id FROM seguimientos WHERE seguidor_id = :viewer)
     ORDER BY seguidores DESC LIMIT ${Number(limit)}`,
    { viewer }
  );
}

/** Valoraciones de la comunidad para un esquí, por tipo de nieve. */
export async function communityRatings(marca, modelo) {
  return q(
    `SELECT v.tipo_nieve AS nieve, ROUND(AVG(v.nota), 1) AS media, COUNT(*) AS votos
     FROM valoraciones v JOIN esquis k ON k.id = v.esqui_id
     WHERE k.marca = :marca AND k.modelo = :modelo GROUP BY v.tipo_nieve ORDER BY votos DESC`,
    { marca, modelo }
  );
}

/** Media de las valoraciones de esquiadores con físico parecido (para el recomendador). */
export async function ratingsFromSimilar({ height, weight, level }) {
  return q(
    `SELECT k.marca, k.modelo, v.tipo_nieve AS nieve, ROUND(AVG(v.nota), 1) AS media, COUNT(*) AS votos
     FROM valoraciones v JOIN esquis k ON k.id = v.esqui_id JOIN usuarios u ON u.id = v.usuario_id
     WHERE u.altura_cm BETWEEN :h - 10 AND :h + 10 AND u.peso_kg BETWEEN :w - 12 AND :w + 12
       AND (u.nivel IS NULL OR ABS(CAST(u.nivel AS SIGNED) - :l) <= 1)
     GROUP BY k.marca, k.modelo, v.tipo_nieve`,
    { h: height, w: weight, l: level }
  );
}
