// Utilidades de presentación compartidas por servidor y cliente
export function timeAgo(date) {
  const d = new Date(typeof date === "string" && !date.includes("T") ? date.replace(" ", "T") : date);
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 7) return `hace ${Math.floor(s / 86400)} d`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export const DIFICULTAD = {
  roja: { label: "Roja", color: "#ff6b5e" },
  negra: { label: "Negra", color: "#e9eef2" },
  doble_negra: { label: "Doble negra", color: "#e9eef2", dash: true },
  alpina: { label: "Alpina", color: "#c39bff" },
};

export const NIEVE = {
  polvo: "Polvo",
  dura: "Dura",
  primavera: "Primavera",
  hielo: "Hielo",
  costra: "Costra",
  venteada: "Venteada",
};

export const ORIENTACIONES = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

export const n = (v) => new Intl.NumberFormat("es-ES").format(v ?? 0);
