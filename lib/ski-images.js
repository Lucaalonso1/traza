import { CATALOG } from "./catalog.js";

export const skiSlug = (brand, model) =>
  `${brand}-${model}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const KNOWN = new Set(CATALOG.map((s) => skiSlug(s.brand, s.model)));

/** Render del esquí; si la IA propone un modelo fuera del catálogo, null. */
export function skiImage(marca, modelo) {
  const slug = skiSlug(marca ?? "", modelo ?? "");
  return KNOWN.has(slug) ? `/media/skis/${slug}.png` : null;
}
