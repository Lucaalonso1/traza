import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CATALOG, LEVELS, STYLES } from "@/lib/catalog";
import { localRecommend, recommendedLength } from "@/lib/engine";
import { currentUser } from "@/lib/server/auth";
import { exec, q } from "@/lib/server/db";
import { ratingsFromSimilar } from "@/lib/server/queries";

// Junta las valoraciones por esquí: media global y la nieve en la que mejor funciona
function byski(rows) {
  const m = new Map();
  for (const r of rows) {
    const k = `${r.marca}|${r.modelo}`.toLowerCase();
    const e = m.get(k) ?? { suma: 0, votos: 0, mejor: null };
    e.suma += r.media * r.votos;
    e.votos += r.votos;
    if (!e.mejor || r.media > e.mejor.media) e.mejor = { nieve: r.nieve, media: r.media };
    m.set(k, e);
  }
  return m;
}

async function community(profile) {
  let rows = await ratingsFromSimilar(profile).catch(() => []);
  let similar = true;
  if (!rows.length) {
    similar = false;
    rows = await q(`SELECT k.marca, k.modelo, v.tipo_nieve AS nieve, ROUND(AVG(v.nota),1) AS media, COUNT(*) AS votos FROM valoraciones v JOIN esquis k ON k.id = v.esqui_id GROUP BY k.marca, k.modelo, v.tipo_nieve`).catch(() => []);
  }
  return { map: byski(rows), similar };
}

function attach(esquis, { map, similar }) {
  return esquis.map((s) => {
    const c = map.get(`${s.marca}|${s.modelo}`.toLowerCase());
    return c ? { ...s, comunidad: { media: Math.round((c.suma / c.votos) * 10) / 10, votos: c.votos, mejorNieve: c.mejor.nieve, similar } } : s;
  });
}

async function log(userId, profile, source, result) {
  await exec("INSERT INTO recomendaciones (usuario_id, perfil, fuente, resultado) VALUES (?, ?, ?, ?)", [
    userId ?? null, JSON.stringify(profile), source, JSON.stringify(result),
  ]).catch(() => {});
}

export const runtime = "nodejs";

const Ski = z.object({
  marca: z.string(),
  modelo: z.string(),
  categoria: z.string(),
  longitudCm: z.number(),
  patinMm: z.number(),
  radioM: z.number(),
  nivel: z.string(),
  encaje: z.number(),
  porQue: z.string(),
  puntosFuertes: z.array(z.string()),
  aTenerEnCuenta: z.string(),
});
const Result = z.object({ resumen: z.string(), esquis: z.array(Ski) });

const SYSTEM = `Eres el asesor de esquís de Traza, experto en material de esquí. Recomiendas esquís concretos (marca y modelo exactos que se venden actualmente) según el físico, el nivel y el estilo de cada esquiador.

Cómo trabajas:
- Devuelve exactamente 5 esquís, del que mejor encaja al que menos.
- Prioriza los modelos del catálogo de referencia que recibes; puedes proponer otros modelos reales si encajan claramente mejor. Nunca inventes modelos.
- La longitud se ajusta a la altura, el peso, el nivel y el estilo. Usa la longitud orientativa que te damos como punto de partida y ajústala por modelo (más larga con rocker o en freeride, más corta en pista o para progresar).
- "encaje" es un número de 0 a 100.
- "porQue" explica en una o dos frases, en español y tuteando, por qué ese esquí le va a esta persona en concreto.
- "puntosFuertes" son 3 rasgos breves (máximo 4 palabras cada uno).
- "aTenerEnCuenta" es una limitación honesta del modelo para este perfil.
- "resumen" es una frase que resume qué tipo de esquí necesita esta persona.
- Si recibes valoraciones de la comunidad, tenlas en cuenta para ordenar y menciónalas de forma natural (por ejemplo: «los esquiadores de tu talla le dan un 4,5 en polvo»).
Las medidas son orientativas; si no estás seguro de una cifra, da la de la talla más común.`;

function parseProfile(body) {
  const height = Number(body?.height);
  const weight = Number(body?.weight);
  const level = Number(body?.level);
  const style = String(body?.style ?? "");
  if (!(height >= 120 && height <= 220)) return { error: "La altura debe estar entre 120 y 220 cm." };
  if (!(weight >= 30 && weight <= 160)) return { error: "El peso debe estar entre 30 y 160 kg." };
  if (!LEVELS[level]) return { error: "Elige un nivel de esquí." };
  if (!STYLES[style]) return { error: "Elige un estilo de esquí." };
  const notes = typeof body?.notes === "string" ? body.notes.slice(0, 400) : "";
  return { profile: { height, weight, level, style, notes } };
}

function hasCredentials() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "No he podido leer tu perfil." }, { status: 400 });
  }
  const { profile, error } = parseProfile(body);
  if (error) return Response.json({ error }, { status: 400 });

  const user = await currentUser().catch(() => null);
  const comm = await community(profile);

  const respond = async (data) => {
    const out = { ...data, esquis: attach(data.esquis, comm) };
    await log(user?.id, profile, data.source, out);
    return Response.json(out);
  };

  const fallback = (reason) =>
    respond({
      source: "catalogo",
      reason,
      resumen: `Para tu perfil, Traza busca un esquí de ${STYLES[profile.style].label.toLowerCase()} de unos ${recommendedLength(profile)} cm.`,
      esquis: localRecommend(profile),
    });

  // Opiniones de la comunidad (esquiadores con físico parecido) para la IA
  const commText = [...comm.map.entries()]
    .sort((a, b) => b[1].votos - a[1].votos)
    .slice(0, 20)
    .map(([k, c]) => `- ${k.replace("|", " ")}: ${(c.suma / c.votos).toFixed(1)}/5 en ${c.votos} valoraciones (mejor en nieve ${c.mejor.nieve})`)
    .join("\n");

  if (!hasCredentials()) return fallback("sin-clave");

  const client = new Anthropic();
  const userMsg = `Perfil del esquiador:
- Altura: ${profile.height} cm
- Peso: ${profile.weight} kg
- Nivel: ${LEVELS[profile.level].label} (${LEVELS[profile.level].short})
- Estilo preferido: ${STYLES[profile.style].label} (${STYLES[profile.style].short})
- Longitud orientativa calculada: ${recommendedLength(profile)} cm
${profile.notes ? `- Notas del esquiador: ${profile.notes}` : ""}

${commText ? `Valoraciones de la comunidad de Traza${comm.similar ? " (esquiadores con físico y nivel parecidos)" : ""}; úsalas como evidencia real y cítalas en "porQue" cuando sean relevantes:\n${commText}\n\n` : ""}Catálogo de referencia (JSON; waist = patín mm, radius = radio m, stiffness 1-5, level = rango 0 principiante a 3 experto):
${JSON.stringify(CATALOG)}`;

  try {
    const response = await client.messages.parse({
      model: process.env.TRAZA_MODEL || process.env.ALTURA_MODEL || "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "medium", format: zodOutputFormat(Result) },
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return fallback("respuesta-no-valida");
    const { resumen, esquis } = response.parsed_output;
    return respond({
      source: "ia",
      resumen,
      esquis: esquis.slice(0, 5).map((s) => ({ ...s, encaje: Math.max(0, Math.min(100, Math.round(s.encaje))) })),
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return fallback("clave-no-valida");
    if (err instanceof Anthropic.RateLimitError) return fallback("limite");
    if (err instanceof Anthropic.APIError) return fallback("error-ia");
    console.error(err);
    return fallback("error-ia");
  }
}
