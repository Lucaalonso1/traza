import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { route, requireUser, HttpError, exec } from "@/lib/server/auth";
import { UPLOAD_DIR } from "@/lib/server/uploads";

const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"]);

// Borra la foto anterior si la había subido el usuario (no las de demostración)
async function removeOld(url) {
  if (!url?.startsWith("/uploads/")) return;
  await fs.unlink(path.join(UPLOAD_DIR, path.basename(url))).catch(() => {});
}

// Cambiar la foto de perfil: se recorta en cuadrado y se guarda a 640 px
export const POST = route(async (req) => {
  const u = await requireUser();
  const form = await req.formData().catch(() => null);
  const file = form?.get("foto");
  if (!file || typeof file !== "object" || !file.size) throw new HttpError(400, "Elige una foto.");
  if (!TYPES.has(file.type)) throw new HttpError(415, "Sube una imagen JPG, PNG, WebP o HEIC.");
  if (file.size > 12 * 1024 * 1024) throw new HttpError(413, "La foto supera los 12 MB.");
  let out;
  try {
    out = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize(640, 640, { fit: "cover", position: "attention" })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new HttpError(415, "No he podido leer esa imagen.");
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomUUID()}.jpg`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), out);
  const url = `/uploads/${name}`;
  await exec("UPDATE usuarios SET avatar_url = ? WHERE id = ?", [url, u.id]);
  await removeOld(u.avatar);
  return Response.json({ avatar: url });
});

// Quitar la foto: vuelve el círculo con la inicial
export const DELETE = route(async () => {
  const u = await requireUser();
  await exec("UPDATE usuarios SET avatar_url = NULL WHERE id = ?", [u.id]);
  await removeOld(u.avatar);
  return Response.json({ avatar: null });
});
