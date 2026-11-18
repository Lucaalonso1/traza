// Crea el esquema y carga datos de demostración en MySQL.
// Uso: npm run db:reset   (necesita `docker compose up -d`)
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { CATALOG } from "../lib/catalog.js";

const root = path.dirname(new URL(import.meta.url).pathname);
const url = process.env.DATABASE_URL || "mysql://traza:traza_dev@127.0.0.1:3307/traza";
const db = await mysql.createConnection({ uri: url, multipleStatements: true });

// Espera a que MySQL acepte conexiones (el contenedor tarda unos segundos al arrancar)
console.log("· creando esquema");
await db.query(fs.readFileSync(path.join(root, "schema.sql"), "utf8"));

const pt = (lng, lat) => `ST_GeomFromText('POINT(${lng} ${lat})', 4326, 'axis-order=long-lat')`;
const line = (coords) =>
  `ST_GeomFromText('LINESTRING(${coords.map(([lng, lat]) => `${lng} ${lat}`).join(", ")})', 4326, 'axis-order=long-lat')`;

// ── Estaciones (coordenadas reales aproximadas) ─────────────────────────────
const AEMET = "https://www.aemet.es/es/eltiempo/prediccion/montana/boletin_peligro_aludes";
const ICGC = "https://bpa.icgc.cat/";
const STATIONS = [
  ["baqueira-beret", "Baqueira-Beret", "España", "Val d'Aran", 0.931, 42.699, 1500, 2610, 167, "Nieve atlántica en el Pirineo central: grandes palas abiertas en Beret y fuera de pista técnico en Baciver.", ICGC],
  ["formigal", "Formigal-Panticosa", "España", "Huesca", -0.364, 42.774, 1500, 2250, 180, "Valles anchos y orientados al norte. Muy cómodo para iniciarse fuera de pista junto a la estación.", AEMET],
  ["candanchu", "Candanchú", "España", "Huesca", -0.527, 42.788, 1530, 2400, 50, "Estación con carácter: canales empinadas y corredores clásicos bajo La Tuca.", AEMET],
  ["cerler", "Cerler", "España", "Huesca", 0.538, 42.588, 1500, 2630, 80, "La estación más alta del Pirineo aragonés, rodeada de tresmiles.", AEMET],
  ["grandvalira", "Grandvalira", "Andorra", "Andorra", 1.734, 42.537, 1710, 2640, 210, "El dominio más grande del Pirineo, con muchas palas fáciles entre pistas.", "https://www.meteo.ad/estatneu"],
  ["la-molina", "La Molina", "España", "Cerdanya", 1.955, 42.337, 1700, 2537, 71, "Soleada y con vistas a la Cerdanya. Nieve primavera de calidad a final de temporada.", ICGC],
  ["sierra-nevada", "Sierra Nevada", "España", "Granada", -3.398, 37.096, 2100, 3300, 110, "La estación más al sur de Europa: nieve dura por la mañana y primavera por la tarde.", "https://www.aemet.es/es/eltiempo/prediccion/montana"],
  ["chamonix", "Chamonix", "Francia", "Alta Saboya", 6.869, 45.924, 1035, 3842, 115, "La capital del alpinismo y del esquí de pendiente extrema, a los pies del Mont Blanc.", "https://meteofrance.com/meteo-montagne"],
  ["val-thorens", "Val Thorens", "Francia", "Saboya", 6.58, 45.297, 1800, 3230, 150, "La estación más alta de Europa: nieve fría y fiable de diciembre a mayo.", "https://meteofrance.com/meteo-montagne"],
  ["verbier", "Verbier", "Suiza", "Valais", 7.228, 46.096, 1500, 3330, 410, "Referencia mundial del freeride: Mont Fort, Bec des Rosses y laderas sin fin.", "https://www.slf.ch/es/boletin-de-aludes-y-situacion-de-la-nieve/"],
];
console.log("· estaciones");
for (const [slug, nombre, pais, region, lng, lat, cmin, cmax, km, desc, bol] of STATIONS) {
  await db.query(
    `INSERT INTO estaciones (slug, nombre, pais, region, ubicacion, cota_min, cota_max, km_pistas, descripcion, boletin_url)
     VALUES (?, ?, ?, ?, ${pt(lng, lat)}, ?, ?, ?, ?, ?)`,
    [slug, nombre, pais, region, cmin, cmax, km, desc, bol]
  );
}
const [st] = await db.query("SELECT id, slug, ST_Longitude(ubicacion) lng, ST_Latitude(ubicacion) lat FROM estaciones");
const S = Object.fromEntries(st.map((s) => [s.slug, s]));

// ── Usuarios de demostración (contraseña común: ver README) ────────────────
console.log("· usuarios");
const hash = await bcrypt.hash("traza2026", 10);
const USERS = [
  ["marta.freeride", "Marta Gil", "Freeride en el Aran y en Verbier cuando puedo. Si hay polvo, no contesto.", "#f2774a", 168, 60, 3, "freeride", "baqueira-beret"],
  ["pau.aran", "Pau Ribera", "Guía en prácticas. Rutas con piel de foca y bajadas largas.", "#7d9db3", 181, 77, 3, "fuerapista", "baqueira-beret"],
  ["lucia.nevada", "Lucía Torres", "Sierra Nevada todo el año. Primavera, sol y corredores del Veleta.", "#e8b04a", 165, 57, 2, "allmountain", "sierra-nevada"],
  ["jon.pirineo", "Jon Etxeberria", "Candanchú y Formigal. Grabo todo con la cámara en el casco.", "#6fb39a", 178, 80, 2, "freeride", "candanchu"],
  ["ines.park", "Inés Martín", "Park y switch. Grandvalira es mi casa.", "#b48ad6", 162, 54, 2, "park", "grandvalira"],
  ["alex.backcountry", "Álex Durand", "Viviendo en Chamonix. Couloirs, glaciares y madrugones.", "#5aa0d8", 184, 82, 3, "fuerapista", "chamonix"],
];
for (const [u, n, bio, color, h, w, lvl, style, home] of USERS) {
  await db.query(
    `INSERT INTO usuarios (username, nombre, email, pass_hash, bio, color, altura_cm, peso_kg, nivel, estilo, estacion_casa)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [u, n, `${u}@demo.traza.test`, hash, bio, color, h, w, lvl, style, S[home].id]
  );
}
// Luca Alonso, con su foto de perfil
await db.query(
  `INSERT INTO usuarios (username, nombre, email, pass_hash, bio, color, avatar_url, nivel, estilo, estacion_casa)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ["luca.alonso", "Luca Alonso", "luca.alonso@demo.traza.test", hash, "Construyendo saltos para que los disfrute todo el mundo. Freestyle y lo que caiga fuera de pista.", "#f2774a", "/media/users/luca-alonso.jpg", 2, "park", S["baqueira-beret"].id]
);
const [us] = await db.query("SELECT id, username FROM usuarios");
const U = Object.fromEntries(us.map((x) => [x.username, x.id]));

console.log("· seguimientos");
const FOLLOWS = [
  ["marta.freeride", ["pau.aran", "alex.backcountry", "jon.pirineo"]],
  ["pau.aran", ["marta.freeride", "alex.backcountry"]],
  ["lucia.nevada", ["marta.freeride", "ines.park"]],
  ["jon.pirineo", ["marta.freeride", "pau.aran", "lucia.nevada"]],
  ["ines.park", ["lucia.nevada", "jon.pirineo"]],
  ["alex.backcountry", ["marta.freeride", "pau.aran"]],
  ["luca.alonso", ["marta.freeride", "pau.aran", "ines.park", "jon.pirineo"]],
  ["marta.freeride", ["luca.alonso"]],
  ["jon.pirineo", ["luca.alonso"]],
  ["ines.park", ["luca.alonso"]],
];
for (const [a, list] of FOLLOWS) for (const b of list) await db.query("INSERT INTO seguimientos (seguidor_id, seguido_id) VALUES (?, ?)", [U[a], U[b]]);

// ── Spots y rutas ───────────────────────────────────────────────────────────
console.log("· spots");
// Ruta = desde un punto alto (dx, dy en grados respecto a la estación) bajando en zigzag
const route = (s, [dx, dy], steps, [sx, sy]) => {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const wig = (i % 2 ? 1 : -1) * 0.0012 * (i > 0 && i < steps ? 1 : 0);
    out.push([+(s.lng + dx + sx * i + wig).toFixed(6), +(s.lat + dy + sy * i).toFixed(6)]);
  }
  return out;
};
const SPOTS = [
  ["baqueira-beret", "pau.aran", "Corredor norte de Baciver", "ruta", "negra", "N", 620, [0.028, 0.02], 6, [-0.0032, -0.0028], "Entrada estrecha desde la cresta y luego una pala ancha que se abre hacia el lago. Ideal dos o tres días después de nevada."],
  ["baqueira-beret", "marta.freeride", "Palas de Beret", "ruta", "roja", "NE", 380, [-0.018, 0.016], 5, [0.0028, -0.0022], "El fuera de pista más amable de la estación: pendiente regular y salida directa a pistas."],
  ["baqueira-beret", "marta.freeride", "Pillow line del bosque", "spot", "negra", "NO", null, [0.008, -0.006], 0, [0, 0], "Escalones de nieve entre pinos. Solo con mucha nieve acumulada y buena visibilidad."],
  ["candanchu", "jon.pirineo", "Canal de La Tuca", "ruta", "doble_negra", "NE", 450, [0.012, 0.018], 5, [-0.0025, -0.003], "Canal empinada y estrecha bajo La Tuca. Exposición alta: imprescindible material y compañía."],
  ["formigal", "jon.pirineo", "Valle de Izas", "ruta", "roja", "N", 520, [0.02, 0.012], 6, [-0.0026, -0.0018], "Vallecito ancho con nieve fría que se conserva mucho tiempo por su orientación norte."],
  ["cerler", "pau.aran", "Cresta de Gallinero", "ruta", "negra", "E", 700, [0.015, 0.02], 7, [-0.002, -0.0026], "Desde la cumbre del Gallinero hacia el valle: larga, variada y con vistas al Aneto."],
  ["sierra-nevada", "lucia.nevada", "Corredor del Veleta", "ruta", "negra", "N", 480, [0.018, -0.012], 5, [-0.0024, 0.0016], "Corredor clásico bajo el Veleta. Por la mañana suele estar duro: espera a que la nieve se transforme."],
  ["sierra-nevada", "lucia.nevada", "Pala de la Laguna", "spot", "roja", "NE", null, [0.01, -0.008], 0, [0, 0], "Pala abierta y soleada para primavera. Perfecta para sacar fotos al atardecer."],
  ["grandvalira", "ines.park", "Bosque de Soldeu", "ruta", "roja", "N", 300, [-0.012, 0.01], 4, [0.0025, -0.002], "Árboles bien espaciados entre pistas. La mejor opción en días de niebla."],
  ["chamonix", "alex.backcountry", "Vallée Blanche", "ruta", "alpina", "N", 2700, [0.02, -0.02], 8, [-0.0045, 0.0035], "Descenso glaciar mítico desde la Aiguille du Midi. Terreno glaciar con grietas: solo con guía o experiencia en glaciar."],
  ["chamonix", "alex.backcountry", "Couloir des Cosmiques", "ruta", "doble_negra", "S", 800, [0.012, -0.016], 5, [-0.0012, 0.0028], "Couloir estrecho y sostenido. Requiere rápel en la entrada según la temporada."],
  ["verbier", "marta.freeride", "Cara norte del Mont Fort", "ruta", "doble_negra", "N", 900, [0.03, -0.018], 7, [-0.0038, 0.0024], "Muro largo y empinado con nieve fría. Una de las bajadas más famosas del valle."],
  ["val-thorens", "ines.park", "Combe de Caron", "ruta", "roja", "NO", 650, [-0.016, -0.01], 6, [0.0024, 0.0014], "Grandes espacios junto a la pista negra. Nieve de altura incluso en abril."],
  ["baqueira-beret", "luca.alonso", "Salto de Beret", "spot", "roja", "NE", null, [-0.012, 0.012], 0, [0, 0], "Salto construido por la comunidad en la zona de Beret. Buena velocidad de entrada desde arriba y llegada limpia y empinada. Revisad la recepción antes de saltar y, si nieva, ayudad a rehacerlo."],
];
for (const [slug, author, name, type, diff, ori, drop, start, steps, step, desc] of SPOTS) {
  const s = S[slug];
  const geom = type === "spot" ? pt(+(s.lng + start[0]).toFixed(6), +(s.lat + start[1]).toFixed(6)) : line(route(s, start, steps, step));
  await db.query(
    `INSERT INTO spots (estacion_id, autor_id, nombre, tipo, descripcion, dificultad, orientacion, desnivel_m, geom)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${geom})`,
    [s.id, U[author], name, type, desc, diff, ori, drop]
  );
}
const [sp] = await db.query("SELECT id, nombre FROM spots");
const P = Object.fromEntries(sp.map((x) => [x.nombre, x.id]));

// ── Publicaciones ───────────────────────────────────────────────────────────
console.log("· publicaciones");
const M = "/media/seed";
const POSTS = [
  // autor, estación, spot, tipo, texto, horas atrás, medios [[tipo, url, poster]]
  ["marta.freeride", "baqueira-beret", "Palas de Beret", "clip", "Primeras huellas en Beret después de 40 cm. No hay nada igual.", 3, [["video", `${M}/clip-1.mp4`, `${M}/clip-1.jpg`]]],
  ["pau.aran", "baqueira-beret", "Corredor norte de Baciver", "ruta", "Subida con pieles de 2 h y una bajada de 600 m que se hace corta. Dejo la traza en el mapa.", 7, [["imagen", `${M}/foto-1.jpg`]]],
  ["lucia.nevada", "sierra-nevada", "Corredor del Veleta", "foto", "A las 12 la nieve ya estaba transformada en el Veleta. Ventana perfecta hasta las 14.", 11, [["imagen", `${M}/foto-5.jpg`]]],
  ["alex.backcountry", "chamonix", "Vallée Blanche", "clip", "Vallée Blanche con luz plana pero nieve increíble en la parte alta.", 20, [["video", `${M}/clip-2.mp4`, `${M}/clip-2.jpg`]]],
  ["jon.pirineo", "candanchu", "Canal de La Tuca", "foto", "La canal estaba en condiciones. Entrada dura y luego nieve fría perfecta.", 26, [["imagen", `${M}/foto-2.jpg`]]],
  ["ines.park", "grandvalira", null, "foto", "Día de park en Grandvalira: el kicker grande por fin abierto.", 30, [["imagen", `${M}/foto-8.jpg`]]],
  ["marta.freeride", "verbier", "Cara norte del Mont Fort", "clip", "El Mont Fort con nieve fría. Piernas temblando arriba, sonrisa abajo.", 44, [["video", `${M}/clip-3.mp4`, `${M}/clip-3.jpg`]]],
  ["pau.aran", "cerler", "Cresta de Gallinero", "foto", "Atardecer desde la cresta del Gallinero. Mañana subimos otra vez.", 52, [["imagen", `${M}/foto-6.jpg`]]],
  ["lucia.nevada", "sierra-nevada", "Pala de la Laguna", "foto", "La pala de la Laguna a última hora. Nieve primavera de manual.", 60, [["imagen", `${M}/foto-7.jpg`]]],
  ["jon.pirineo", "formigal", "Valle de Izas", "foto", "Izas sigue guardando nieve polvo por la orientación norte.", 72, [["imagen", `${M}/foto-3.jpg`]]],
  ["alex.backcountry", "chamonix", null, "foto", "Madrugón para ver salir el sol sobre el macizo. Nada de esquí hoy, solo mirar.", 90, [["imagen", `${M}/foto-4.jpg`]]],
  ["ines.park", "val-thorens", "Combe de Caron", "foto", "Combe de Caron con nieve de altura en pleno abril.", 110, [["imagen", `${M}/foto-1.jpg`]]],
];
for (const [author, slug, spot, type, text, hoursAgo, media] of POSTS) {
  const [r] = await db.query(
    `INSERT INTO publicaciones (autor_id, estacion_id, spot_id, tipo, texto, creado_en)
     VALUES (?, ?, ?, ?, ?, NOW() - INTERVAL ? HOUR)`,
    [U[author], S[slug].id, spot ? P[spot] : null, type, text, hoursAgo]
  );
  let k = 0;
  for (const [mt, u, poster] of media)
    await db.query("INSERT INTO medios (publicacion_id, tipo, url, poster_url, orden) VALUES (?, ?, ?, ?, ?)", [r.insertId, mt, u, poster ?? null, k++]);
}
// Publicación de Luca: el salto que hemos construido en Beret (con su vídeo si está en el proyecto)
{
  const clip = "/media/users/luca-salto.mp4";
  const hasClip = fs.existsSync(path.join(root, "..", "public", clip));
  const [r] = await db.query(
    `INSERT INTO publicaciones (autor_id, estacion_id, spot_id, tipo, texto, creado_en) VALUES (?, ?, ?, ?, ?, NOW() - INTERVAL 1 HOUR)`,
    [U["luca.alonso"], S["baqueira-beret"].id, P["Salto de Beret"], hasClip ? "clip" : "ruta",
     "Hemos construido un salto en Beret para que lo use todo el que quiera. Entrada rápida, despegue suave y llegada limpia. Pasad a probarlo y subid vuestro clip. Está marcado en el mapa."]
  );
  if (hasClip) await db.query("INSERT INTO medios (publicacion_id, tipo, url, poster_url) VALUES (?, 'video', ?, ?)", [r.insertId, clip, "/media/users/luca-salto.jpg"]);
}
const [ps] = await db.query("SELECT id FROM publicaciones ORDER BY id");

console.log("· me gusta y comentarios");
const names = Object.keys(U);
for (const [i, p] of ps.entries())
  for (const [j, n] of names.entries()) if ((i + j * 3) % 4 !== 0) await db.query("INSERT INTO me_gusta (usuario_id, publicacion_id) VALUES (?, ?)", [U[n], p.id]);
const COMMENTS = [
  [0, "pau.aran", "¡Qué envidia! ¿A qué hora abrieron Beret?"],
  [0, "jon.pirineo", "Esa nieve se ve perfecta. Este finde voy."],
  [1, "marta.freeride", "Guardada. ¿Cómo estaba la entrada de la cresta?"],
  [1, "pau.aran", "Con costra los primeros metros, luego polvo hasta abajo."],
  [2, "ines.park", "La foto es una pasada."],
  [3, "marta.freeride", "Esa es la línea que tengo pendiente este año."],
  [4, "alex.backcountry", "Buena elección esperando a que asentara."],
  [6, "pau.aran", "Bestial. ¿Con qué esquís bajaste?"],
  [6, "marta.freeride", "Con los Bent 110, flotan muchísimo."],
  [12, "marta.freeride", "¡Qué currada! Mañana subo a probarlo."],
  [12, "jon.pirineo", "¿Cuánto mide el despegue? Para llevar la cámara."],
  [12, "luca.alonso", "Unos 4 metros de mesa. Llegada bastante larga, se puede ir con confianza."],
];
for (const [pi, author, text] of COMMENTS) await db.query("INSERT INTO comentarios (publicacion_id, autor_id, texto) VALUES (?, ?, ?)", [ps[pi].id, U[author], text]);

console.log("· guardados");
for (const [n, spot] of [["marta.freeride", "Corredor norte de Baciver"], ["jon.pirineo", "Palas de Beret"], ["lucia.nevada", "Vallée Blanche"], ["marta.freeride", "Couloir des Cosmiques"]])
  await db.query("INSERT INTO guardados (usuario_id, spot_id) VALUES (?, ?)", [U[n], P[spot]]);

// ── Informes de nieve (hoy y ayer) ──────────────────────────────────────────
console.log("· informes de nieve");
const REPORTS = [
  ["baqueira-beret", "marta.freeride", 0, "polvo", 5, "40 cm nuevos en Beret. Baciver todavía cargado: prudencia."],
  ["baqueira-beret", "pau.aran", 1, "venteada", 3, "Viento fuerte en las crestas, placas en orientaciones sur."],
  ["sierra-nevada", "lucia.nevada", 0, "primavera", 4, "Dura hasta las 11, después primavera perfecta."],
  ["candanchu", "jon.pirineo", 0, "dura", 3, "Rehielo de noche. Mejor a partir de mediodía."],
  ["formigal", "jon.pirineo", 1, "polvo", 4, "Nieve fría en las caras norte de Izas."],
  ["grandvalira", "ines.park", 0, "dura", 3, "Pistas muy bien pisadas, park en buen estado."],
  ["chamonix", "alex.backcountry", 0, "polvo", 5, "30 cm en altura, visibilidad regular por la tarde."],
  ["verbier", "marta.freeride", 1, "costra", 2, "Costra en las solanas. Las caras norte, bien."],
];
for (const [slug, author, daysAgo, snow, q, note] of REPORTS)
  await db.query(
    "INSERT INTO informes_nieve (estacion_id, autor_id, fecha, tipo_nieve, calidad, nota) VALUES (?, ?, CURDATE() - INTERVAL ? DAY, ?, ?, ?)",
    [S[slug].id, U[author], daysAgo, snow, q, note]
  );

// ── Esquís del catálogo y valoraciones de la comunidad ─────────────────────
console.log("· esquís y valoraciones");
for (const c of CATALOG)
  await db.query(
    "INSERT INTO esquis (marca, modelo, estilo, patin_mm, radio_m, rigidez, nivel_min, nivel_max) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [c.brand, c.model, c.style, c.waist, c.radius, c.stiffness, c.level[0], c.level[1]]
  );
const [sk] = await db.query("SELECT id, marca, modelo, patin_mm, estilo FROM esquis");
const snows = ["polvo", "dura", "primavera", "venteada"];
for (const [ui, n] of names.entries())
  for (const [si, s] of sk.entries()) {
    if ((ui * 7 + si * 3) % 5 > 1) continue;
    for (const [ni, snow] of snows.entries()) {
      if ((ui + si + ni) % 2) continue;
      // los patines anchos puntúan mejor en polvo; los estrechos, en dura
      const wide = s.patin_mm >= 100, narrow = s.patin_mm <= 80;
      let nota = 3 + ((ui + si + ni) % 3 === 0 ? 1 : 0);
      if (snow === "polvo") nota += wide ? 1 : narrow ? -2 : 0;
      if (snow === "dura") nota += narrow ? 1 : wide ? -1 : 0;
      nota = Math.max(1, Math.min(5, nota));
      await db.query("INSERT INTO valoraciones (usuario_id, esqui_id, tipo_nieve, nota) VALUES (?, ?, ?, ?)", [U[n], s.id, snow, nota]);
    }
  }

const [[counts]] = await db.query(`SELECT
  (SELECT COUNT(*) FROM usuarios) usuarios, (SELECT COUNT(*) FROM estaciones) estaciones,
  (SELECT COUNT(*) FROM spots) spots, (SELECT COUNT(*) FROM publicaciones) publicaciones,
  (SELECT COUNT(*) FROM valoraciones) valoraciones`);
console.log("✓ base de datos lista", counts);
await db.end();
