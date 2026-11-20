// Renderiza promo.html fotograma a fotograma y lo codifica con ffmpeg.
//   node render.mjs                       → traza-promo.mp4 (1920×1080, 30 fps, desenfoque de movimiento y audio)
//   node render.mjs --mb 1                → sin desenfoque de movimiento (más rápido)
//   node render.mjs --stills 2,8,13,20    → capturas PNG sueltas en frames/
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).join(" ").split("--").filter(Boolean).map((a) => a.trim().split(/\s+/)));
const FPS = Number(args.fps ?? 30);
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.join(here, args.out ?? "traza-promo.mp4");
const MB = Number(args.mb ?? 4);          // subfotogramas por fotograma (desenfoque de movimiento)
const SHUTTER = 0.5;                      // obturador de 180°
const AUDIO = path.join(here, "audio", "mix.wav");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 120000,
  args: ["--hide-scrollbars", "--allow-file-access-from-files", "--autoplay-policy=no-user-gesture-required", "--force-color-profile=srgb"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("page:", e.message));
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, "promo.html")).href, { waitUntil: "networkidle0" });
const { duration } = await page.evaluate(() => window.ready);

if (args.stills) {
  fs.mkdirSync(path.join(here, "frames"), { recursive: true });
  for (const t of args.stills.split(",").map(Number)) {
    await page.evaluate((t) => window.frame(t), t);
    await page.screenshot({ path: path.join(here, "frames", `t-${t}.png`) });
    console.log("✓", t);
  }
  await browser.close();
  process.exit(0);
}

const total = Math.round(duration * FPS);
const hasAudio = fs.existsSync(AUDIO);
const vf = MB > 1 ? ["-vf", `tmix=frames=${MB}:weights=${Array(MB).fill(1).join(" ")},select='not(mod(n\\,${MB}))',setpts=N/(${FPS}*TB)`] : [];
const ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(FPS * MB), "-c:v", "png", "-i", "-",
  ...(hasAudio ? ["-i", AUDIO] : []),
  ...vf, "-r", String(FPS),
  "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
  "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
  ...(hasAudio ? ["-af", "loudnorm=I=-14:TP=-1:LRA=11", "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-shortest"] : []),
  "-movflags", "+faststart", OUT,
], { stdio: ["pipe", "inherit", "inherit"] });

const started = Date.now();
for (let i = 0; i < total; i++) {
  for (let k = 0; k < MB; k++) {
    // los subfotogramas reparten el tiempo de obturación alrededor del fotograma
    const t = (i + (MB > 1 ? (k / MB - 0.5) * SHUTTER : 0)) / FPS;
    await page.evaluate((t) => window.frame(t), Math.max(0, t));
    const buf = await page.screenshot({ type: "png", optimizeForSpeed: true });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  }
  if (i % FPS === 0) process.stdout.write(`\r${Math.round((i / total) * 100)}%  ${((Date.now() - started) / 1000).toFixed(0)} s`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log(`\n→ ${OUT}`);
