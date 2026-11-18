import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { HttpError } from "./auth";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const TYPES = {
  "video/mp4": ["video", "mp4"],
  "video/webm": ["video", "webm"],
  "video/quicktime": ["video", "mov"],
  "image/jpeg": ["imagen", "jpg"],
  "image/png": ["imagen", "png"],
  "image/webp": ["imagen", "webp"],
};
const MAX = { video: 80 * 1024 * 1024, imagen: 12 * 1024 * 1024 };

/** Guarda un archivo subido y devuelve { tipo, url }. */
export async function saveUpload(file) {
  const t = TYPES[file.type];
  if (!t) throw new HttpError(415, "Formato no admitido. Sube vídeo MP4, WebM o MOV, o una imagen JPG, PNG o WebP.");
  const [tipo, ext] = t;
  if (file.size > MAX[tipo]) throw new HttpError(413, tipo === "video" ? "El clip supera los 80 MB." : "La imagen supera los 12 MB.");
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomUUID()}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return { tipo, url: `/uploads/${name}` };
}

export const MIME = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
