// Catálogo de referencia de Traza. Lo usa el motor local cuando no hay IA
// disponible y se le pasa a la IA como base para que no invente modelos.
// waist = patín en mm, radius = radio de giro aproximado (m), stiffness 1-5.
// level = [mínimo, máximo] en la escala 0 principiante … 3 experto.
// Las medidas son orientativas: varían según talla y temporada.

export const STYLES = {
  pista: { label: "Pista", short: "Carving y nieve pisada" },
  allmountain: { label: "Todo-montaña", short: "Un esquí para todo" },
  fuerapista: { label: "Fuera de pista", short: "Nieve virgen junto a la pista" },
  freeride: { label: "Freeride", short: "Polvo profundo y líneas grandes" },
  park: { label: "Park", short: "Saltos, cajones y switch" },
};

export const LEVELS = [
  { id: 0, label: "Principiante", short: "Cuña y primeros virajes" },
  { id: 1, label: "Intermedio", short: "Rojas con paralelo" },
  { id: 2, label: "Avanzado", short: "Negras y algo de nieve virgen" },
  { id: 3, label: "Experto", short: "Cualquier terreno, cualquier nieve" },
];

export const CATALOG = [
  // — Pista
  { brand: "Rossignol", model: "Experience 76", style: "pista", waist: 76, radius: 14, stiffness: 1, level: [0, 1] },
  { brand: "Salomon", model: "S/Max 8", style: "pista", waist: 71, radius: 15, stiffness: 2, level: [0, 1] },
  { brand: "Head", model: "Supershape e-Magnum", style: "pista", waist: 72, radius: 13.6, stiffness: 4, level: [1, 3] },
  { brand: "Atomic", model: "Redster S9", style: "pista", waist: 68, radius: 12.6, stiffness: 5, level: [2, 3] },
  { brand: "Völkl", model: "Deacon 76", style: "pista", waist: 76, radius: 15.9, stiffness: 4, level: [1, 3] },
  { brand: "Rossignol", model: "Hero Elite ST Ti", style: "pista", waist: 68, radius: 13, stiffness: 5, level: [2, 3] },
  // — Todo-montaña
  { brand: "Elan", model: "Ripstick 88", style: "allmountain", waist: 88, radius: 15, stiffness: 2, level: [1, 2] },
  { brand: "Salomon", model: "Stance 90", style: "allmountain", waist: 90, radius: 17, stiffness: 3, level: [1, 3] },
  { brand: "Blizzard", model: "Brahma 88", style: "allmountain", waist: 88, radius: 17, stiffness: 4, level: [2, 3] },
  { brand: "Atomic", model: "Maverick 88 Ti", style: "allmountain", waist: 88, radius: 16, stiffness: 3, level: [1, 3] },
  { brand: "Head", model: "Kore 93", style: "allmountain", waist: 93, radius: 16.3, stiffness: 3, level: [1, 3] },
  { brand: "Völkl", model: "Mantra M7", style: "allmountain", waist: 96, radius: 19, stiffness: 5, level: [2, 3] },
  { brand: "Nordica", model: "Enforcer 94", style: "allmountain", waist: 94, radius: 17.5, stiffness: 4, level: [2, 3] },
  // — Fuera de pista
  { brand: "Völkl", model: "Blaze 94", style: "fuerapista", waist: 94, radius: 17, stiffness: 2, level: [1, 2] },
  { brand: "Atomic", model: "Backland 98", style: "fuerapista", waist: 98, radius: 19, stiffness: 3, level: [1, 3] },
  { brand: "Black Crows", model: "Camox Freebird", style: "fuerapista", waist: 97, radius: 20, stiffness: 3, level: [2, 3] },
  { brand: "Blizzard", model: "Zero G 95", style: "fuerapista", waist: 95, radius: 22, stiffness: 4, level: [2, 3] },
  // — Freeride
  { brand: "Blizzard", model: "Rustler 10", style: "freeride", waist: 102, radius: 18, stiffness: 3, level: [1, 3] },
  { brand: "Salomon", model: "QST 106", style: "freeride", waist: 106, radius: 20, stiffness: 3, level: [1, 3] },
  { brand: "Nordica", model: "Enforcer 104 Free", style: "freeride", waist: 104, radius: 18.5, stiffness: 5, level: [2, 3] },
  { brand: "Völkl", model: "Revolt 104", style: "freeride", waist: 104, radius: 20, stiffness: 3, level: [2, 3] },
  { brand: "Black Crows", model: "Atris", style: "freeride", waist: 108, radius: 22, stiffness: 4, level: [2, 3] },
  { brand: "Atomic", model: "Bent 110", style: "freeride", waist: 110, radius: 19, stiffness: 3, level: [2, 3] },
  // — Park
  { brand: "K2", model: "Reckoner 92", style: "park", waist: 92, radius: 17, stiffness: 2, level: [1, 2] },
  { brand: "Line", model: "Blend", style: "park", waist: 100, radius: 22, stiffness: 2, level: [1, 3] },
  { brand: "Armada", model: "ARV 96", style: "park", waist: 96, radius: 18, stiffness: 3, level: [1, 3] },
  { brand: "Faction", model: "Prodigy 2", style: "park", waist: 98, radius: 18, stiffness: 3, level: [2, 3] },
];
