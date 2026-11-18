// Recorta las fotos de producto (Vision, macOS 14+), las endereza según el eje principal
// de la máscara y exporta PNG transparentes a public/media/skis.
// Uso: swiftc -O scripts/ski-images/cutout.swift -o scripts/ski-images/cutout
//      node scripts/ski-images/process.cjs <carpeta-con-jpg> public/media/skis
const { execFileSync } = require("child_process");
const fs = require("fs");
const sharp = require("sharp");
const [src, out] = [process.argv[2], process.argv[3]];
const tools = __dirname;
(async () => {
  for (const f of fs.readdirSync(src).filter((x) => x.endsWith(".jpg")).sort()) {
    const name = f.replace(".jpg", "");
    const cut = `${src}/${name}.cut.png`;
    const r = execFileSync(`${tools}/cutout`, [`${src}/${f}`, cut]).toString().trim();
    // ángulo del eje mayor a partir de los momentos de la máscara
    const { data, info } = await sharp(cut).resize({ width: 400, height: 400, fit: "inside" }).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
    let m = 0, sx = 0, sy = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) { const a = data[y * info.width + x] / 255; m += a; sx += a * x; sy += a * y; }
    const cx = sx / m, cy = sy / m;
    let u20 = 0, u02 = 0, u11 = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) { const a = data[y * info.width + x] / 255; u20 += a * (x - cx) ** 2; u02 += a * (y - cy) ** 2; u11 += a * (x - cx) * (y - cy); }
    const theta = (0.5 * Math.atan2(2 * u11, u20 - u02) * 180) / Math.PI;
    // borde más limpio: sube el contraste del alfa para quitar el halo claro del fondo de estudio
    const rgb = await sharp(cut).removeAlpha().toBuffer();
    const a = await sharp(cut).extractChannel(3).raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < a.data.length; i++) a.data[i] = Math.max(0, Math.min(255, (a.data[i] - 118) * 6));
    const raw = { width: a.info.width, height: a.info.height, channels: 1 };
    const alpha = await sharp(a.data, { raw }).blur(0.9).toColourspace("b-w").raw().toBuffer();
    const clean = await sharp(rgb).joinChannel(alpha, { raw }).png().toBuffer();
    const rotated = await sharp(clean).rotate(-theta, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    // recorte al contenido según el alfa
    const ra = await sharp(rotated).extractChannel(3).raw().toBuffer({ resolveWithObject: true });
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < ra.info.height; y++) for (let x = 0; x < ra.info.width; x++) if (ra.data[y * ra.info.width + x] > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const pad = 4;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(ra.info.width - 1, x1 + pad); y1 = Math.min(ra.info.height - 1, y1 + pad);
    const trimmed = await sharp(rotated).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toBuffer();
    await sharp(trimmed).resize({ width: 2000 }).png({ compressionLevel: 9, palette: true, quality: 92, effort: 10, dither: 0.6 }).toFile(`${out}/${name}.png`);
    const meta = await sharp(`${out}/${name}.png`).metadata();
    console.log(name, r, "θ=" + theta.toFixed(1), meta.width + "x" + meta.height);
  }
})();
