import { CATALOG, LEVELS, STYLES } from "./catalog";

const NEIGHBOURS = {
  pista: ["allmountain"],
  allmountain: ["pista", "fuerapista", "freeride"],
  fuerapista: ["freeride", "allmountain"],
  freeride: ["fuerapista", "allmountain"],
  park: ["allmountain", "freeride"],
};

const IDEAL_WAIST = { pista: 72, allmountain: 90, fuerapista: 96, freeride: 106, park: 96 };

/** Longitud orientativa en cm a partir de altura, peso, nivel y estilo. */
export function recommendedLength({ height, weight, level, style }) {
  const byLevel = [-15, -9, -4, 0][level] ?? -6;
  const byStyle = { pista: -3, allmountain: 0, fuerapista: 2, freeride: 4, park: -2 }[style] ?? 0;
  const bmi = weight / (height / 100) ** 2;
  const byWeight = bmi > 27 ? 4 : bmi > 24.5 ? 2 : bmi < 19.5 ? -4 : 0;
  const len = height + byLevel + byStyle + byWeight;
  return Math.round(Math.min(Math.max(len, 120), 196));
}

/** Motor local: puntúa el catálogo y devuelve los 5 mejores con explicación. */
export function localRecommend(profile) {
  const { height, weight, level, style } = profile;
  const len = recommendedLength(profile);
  const heavy = weight / (height / 100) ** 2 > 25;
  const idealStiff = Math.min(5, Math.max(1, level + 1 + (heavy ? 1 : 0)));

  const scored = CATALOG.map((ski) => {
    let s = 0;
    if (ski.style === style) s += 55;
    else if (NEIGHBOURS[style]?.includes(ski.style)) s += 26;
    const [lo, hi] = ski.level;
    if (level >= lo && level <= hi) s += 30;
    else s += Math.max(0, 30 - 16 * Math.min(Math.abs(level - lo), Math.abs(level - hi)));
    s += 15 - 5 * Math.abs(ski.stiffness - idealStiff);
    s -= Math.abs(ski.waist - IDEAL_WAIST[style]) / 3; // desempate por patín
    return { ski, score: Math.max(0, Math.min(98, Math.round(s * 0.97))) };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return scored.map(({ ski, score }) => {
    const skiLen = Math.round(len + (ski.style === "freeride" ? 2 : ski.style === "pista" ? -2 : 0));
    return {
      marca: ski.brand,
      modelo: ski.model,
      categoria: STYLES[ski.style].label,
      longitudCm: skiLen,
      patinMm: ski.waist,
      radioM: ski.radius,
      nivel: `${LEVELS[ski.level[0]].label} – ${LEVELS[ski.level[1]].label}`,
      encaje: score,
      porQue: explain(ski, profile, idealStiff),
      puntosFuertes: strengths(ski),
      aTenerEnCuenta: caveat(ski, profile),
    };
  });
}

function explain(ski, { level, style }, idealStiff) {
  const parts = [];
  if (ski.style === style) parts.push(`Está pensado justo para ${STYLES[style].label.toLowerCase()}`);
  else parts.push(`Aunque es un ${STYLES[ski.style].label.toLowerCase()}, cubre bien ${STYLES[style].label.toLowerCase()}`);
  if (ski.stiffness < idealStiff) parts.push("es más permisivo de lo que podrías exigirle, así que perdona errores");
  else if (ski.stiffness > idealStiff) parts.push("es exigente: te hará progresar si vas con ganas");
  else parts.push(`su rigidez encaja con un nivel ${LEVELS[level].label.toLowerCase()}`);
  const w = ski.waist, r = ski.radius;
  const detail =
    w >= 106 ? `Sus ${w} mm de patín te mantienen a flote los días de mucha nieve`
    : w >= 100 ? `Con ${w} mm de patín tiene flotación sin volverse torpe en pista`
    : w >= 92 ? `Sus ${w} mm de patín reparten bien entre pista y nieve virgen`
    : w >= 80 ? `Con ${w} mm de patín cambia de canto rápido y sigue siendo polivalente`
    : `Con solo ${w} mm de patín muerde la nieve dura como pocos`;
  const turn = r <= 14 ? "y su radio corto pide giros cerrados" : r >= 20 ? "y su radio largo le da estabilidad a velocidad" : "y su radio medio se adapta a cualquier giro";
  return `${parts.join(" y ")}. ${detail} ${turn}.`;
}

function strengths(ski) {
  const out = [];
  if (ski.radius <= 14) out.push("Giro corto y rápido");
  else if (ski.radius >= 19) out.push("Estable a alta velocidad");
  else out.push("Giro versátil");
  if (ski.waist <= 76) out.push("Agarre en nieve dura");
  else if (ski.waist >= 100) out.push("Flota en nieve polvo");
  else out.push("Equilibrio pista / fuera");
  out.push(ski.stiffness <= 2 ? "Muy fácil de girar" : ski.stiffness >= 4 ? "Precisión y potencia" : "Flex equilibrado");
  return out;
}

function caveat(ski, { level }) {
  if (ski.level[0] > level) return "Puede quedarte grande al principio; pruébalo antes si puedes.";
  if (ski.waist >= 104) return "En pista helada pierde agarre frente a un patín más estrecho.";
  if (ski.waist <= 72) return "En nieve polvo se hunde: es un esquí de pista.";
  return "Comprueba la talla disponible más cercana a la recomendada.";
}
