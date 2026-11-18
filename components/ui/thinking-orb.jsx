"use client";
// Orbe de puntos que «piensa» mientras la IA elige tus esquís.
// Adaptado del componente «AI thinking orb» (MorphOrb) al sistema de Traza:
// sin Tailwind ni TypeScript, colores de la marca y control por props.
//   done=false → la bola crece, se ensambla la esfera y alterna programas de luz
//   done=true  → barrido naranja, implosión en vórtice, pulso y onComplete()
import { useEffect, useRef, useState } from "react";

const CANVAS = 240,
  ORB_R = 74,
  TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;

function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  const solve = (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) return t;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0,
      hi = 1;
    t = x;
    for (let i = 0; i < 40; i++) {
      const e = sx(t);
      if (Math.abs(e - x) < 1e-6) break;
      if (x > e) lo = t;
      else hi = t;
      t = (hi - lo) / 2 + lo;
    }
    return t;
  };
  return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : sy(solve(x)));
}

const E = {
  out: cubicBezier(0.22, 1, 0.36, 1),
  io: cubicBezier(0.65, 0, 0.35, 1),
  in: cubicBezier(0.4, 0, 1, 1),
  grow: cubicBezier(0.3, 0, 0.2, 1),
  vortex: cubicBezier(0.6, 0, 0.2, 1),
  spring: cubicBezier(0.34, 1.4, 0.64, 1),
};
const T = (ch, from, to, t0, t1, ease = E.io) => ({ ch, from, to, t0, t1, ease });

// La bola pequeña crece y se convierte en esfera de puntos
const ASSEMBLE = [
  T("ball", 0, 1, 0, 260, E.out),
  T("ballScale", 0.35, 1.15, 0, 620, E.grow),
  T("ball", 1, 0, 520, 820, E.out),
  T("k", 0, 1, 420, 1220, E.out),
  T("alpha", 0, 1, 420, 1220, E.out),
  T("spin", 0, 0.9, 420, 1220, E.out),
  T("pop", 1, 1.05, 420, 840, E.out),
  T("pop", 1.05, 1, 840, 1220, E.io),
  T("halo", 0, 0.6, 300, 1200, E.out),
  T("label", 0, 1, 700, 1040, E.out),
];
// Resultado listo: barrido de color y pequeño latido
const RESOLVE = [
  T("sweep", 0, 1, 0, 700, E.io),
  T("spin", 0.9, 0.3, 0, 700, E.out),
  T("gain", 1, 0, 0, 700, E.out),
  T("floor", 0, 0.95, 400, 900, E.out),
  T("rad", 0, 0.15, 400, 900, E.out),
  T("pop", 1, 1.04, 600, 800, E.out),
  T("pop", 1.04, 1, 800, 900, E.out),
];
// Implosión en vórtice hasta un punto naranja que late
const CONDENSE = [
  T("pop", 1, 1.06, 0, 120, E.out),
  T("label", 1, 0, 0, 160, E.in),
  T("k", 1, 0, 120, 640, E.vortex),
  T("vortex", 0, 1.6, 120, 640, E.vortex),
  T("core", 0, 1, 260, 700, E.spring),
  T("pulse", 0, 1, 320, 760, E.out),
  T("alpha", 1, 0, 500, 800, E.out),
  T("halo", 0.6, 0, 500, 900, E.out),
  T("core", 1, 0, 820, 1080, E.out),
];

// Puntos sobre una esfera, en anillos
const RINGS = 16;
const DOTS = (() => {
  let a = 7;
  const rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [];
  for (let k = 0; k < RINGS; k++) {
    const y = 1 - ((k + 0.5) / RINGS) * 2;
    const r = Math.sqrt(1 - y * y);
    const m = Math.max(4, Math.round(30 * r));
    for (let j = 0; j < m; j++) {
      const ang = (j / m) * TAU + k * 0.35;
      out.push({ x: Math.cos(ang) * r, y, z: Math.sin(ang) * r, u: (1 - y) / 2, seed: rand() * 6.283 });
    }
  }
  return out;
})();
const N = DOTS.length;

function palette(fromRgb, toRgb) {
  const G = 24,
    A = 48,
    out = [];
  for (let gi = 0; gi <= G; gi++) {
    const g = gi / G;
    const c = fromRgb.map((v, i) => Math.round(lerp(v, toRgb[i], g)));
    for (let ai = 0; ai <= A; ai++) out.push(`rgba(${c[0]},${c[1]},${c[2]},${(ai / A).toFixed(3)})`);
  }
  return { colors: out, G, A };
}

function createOrb(canvas, reduced) {
  const P = { k: 0, alpha: 0, spin: 0, rot: 0, sweep: 0, pop: 1, vortex: 0, gain: 1, floor: 0, rad: 0, prog: 0 };
  const ctx = canvas.getContext("2d");
  const lit = new Float32Array(N);
  const SX = new Float32Array(N),
    SY = new Float32Array(N),
    SR = new Float32Array(N),
    SD = new Float32Array(N);
  const SC = new Int16Array(N);
  const pw = [1, 0, 0, 0];
  let time = reduced ? 1.2 : 0,
    raf = 0,
    last = 0,
    dead = false;
  if (!ctx) return { P, ensure() {}, destroy() {} };

  const textRgb = getComputedStyle(document.documentElement).getPropertyValue("--text-rgb").trim().split(/\s+/).map(Number);
  const { colors, G, A } = palette(textRgb.length === 3 ? textRgb : [242, 245, 247], [255, 139, 92]);

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(CANVAS * dpr);
  canvas.height = Math.round(CANVAS * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const S = 0.6,
    CP = Math.cos(0.35),
    SP = Math.sin(0.35),
    C0 = CANVAS / 2;

  const draw = (dt) => {
    ctx.clearRect(0, 0, CANVAS, CANVAS);
    time += dt;
    P.rot += P.spin * dt;
    const yaw = P.rot + P.vortex,
      cyw = Math.cos(yaw),
      syw = Math.sin(yaw);
    const stepW = dt / 0.35;
    for (let q = 0; q < 4; q++) {
      const d = (q === P.prog ? 1 : 0) - pw[q];
      pw[q] += Math.abs(d) <= stepW ? d : d > 0 ? stepW : -stepW;
    }
    const decay = Math.exp(-dt / 0.5);
    const h0 = (time * 300) % N,
      h3 = (time * 480) % N;
    const a1 = time * 0.8,
      b1 = Math.sin(time * 0.5) * 0.9;
    const f1x = Math.cos(b1) * Math.cos(a1),
      f1y = Math.sin(b1),
      f1z = Math.cos(b1) * Math.sin(a1);
    const a2 = time * 0.55 + 2.1,
      b2 = Math.cos(time * 0.42) * 0.9;
    const f2x = Math.cos(b2) * Math.cos(a2),
      f2y = Math.sin(b2),
      f2z = Math.cos(b2) * Math.sin(a2);
    const lat = Math.sin(time * 2.2);
    const swirlK = P.vortex * 1.5;

    for (let n = 0; n < N; n++) {
      const { x: dx, y: dy, z: dz, u, seed } = DOTS[n];
      // programas de luz: cada etiqueta enciende los puntos de una forma
      let pulse = 0;
      if (pw[0] > 0.001) {
        let dd = Math.abs(n - h0);
        if (dd > N - dd) dd = N - dd;
        const v = Math.max(0, 1 - dd / 16);
        pulse = Math.max(pulse, v * v * pw[0]);
      }
      if (pw[1] > 0.001) {
        const v = Math.max(
          Math.max(0, (dx * f1x + dy * f1y + dz * f1z - 0.72) / 0.28),
          Math.max(0, (dx * f2x + dy * f2y + dz * f2z - 0.72) / 0.28),
        );
        pulse = Math.max(pulse, v * v * pw[1]);
      }
      if (pw[2] > 0.001) {
        const e = dy - lat;
        const v = Math.max(0, 1 - (e * e) / 0.02);
        pulse = Math.max(pulse, v * v * pw[2]);
      }
      if (pw[3] > 0.001) {
        let dd = Math.abs(n - h3);
        if (dd > N - dd) dd = N - dd;
        const v = Math.max(0, 1 - dd / 22);
        pulse = Math.max(pulse, v * v * pw[3]);
      }
      const l = Math.max(lit[n] * decay, pulse * P.gain);
      lit[n] = l;

      const ki = clamp01(P.k * (1 + S) - S * u);
      if (ki <= 0.001) {
        SC[n] = -1;
        continue;
      }
      const eo = E.out(ki),
        kk = eo * P.pop;
      const x1 = dx * cyw + dz * syw,
        z1 = -dx * syw + dz * cyw;
      const y2 = dy * CP - z1 * SP,
        z2 = dy * SP + z1 * CP;
      const f = 2.8 / (2.8 - z2),
        depth = (z2 + 1) / 2;
      let ox = x1 * ORB_R * kk * f,
        oy = -y2 * ORB_R * kk * f;
      if (swirlK > 0.001) {
        const sw = (1 - ki) * swirlK,
          cc = Math.cos(sw),
          ss = Math.sin(sw);
        const tx = ox * cc - oy * ss;
        oy = ox * ss + oy * cc;
        ox = tx;
      }
      const g = clamp01((P.sweep * 1.4 - u) / 0.4);
      let a =
        0.1 +
        0.035 * Math.sin(seed + time * 1.6) * (1 - g) +
        0.32 * depth * depth +
        0.75 * l * (1 - g) +
        g * (0.55 + 0.4 * depth) +
        2 * g * (1 - g);
      a = Math.max(a, P.floor * (0.7 + 0.3 * depth));
      if (a > 1) a = 1;
      a *= eo * P.alpha;
      SX[n] = C0 + ox;
      SY[n] = C0 + oy;
      SD[n] = depth;
      SR[n] = (1.15 * (0.45 + 0.75 * depth) * f + 0.9 * l + g * 0.25) * (1 + P.rad) * (0.4 + 0.6 * eo);
      const ai = Math.round(a * A),
        gi = Math.round(g * G);
      SC[n] = ai <= 0 ? -1 : gi * (A + 1) + ai;
    }
    // primero la mitad de atrás, luego la de delante
    for (let pass = 0; pass < 2; pass++) {
      for (let n = 0; n < N; n++) {
        const c = SC[n];
        if (c < 0 || SD[n] >= 0.5 !== (pass === 1)) continue;
        ctx.fillStyle = colors[c];
        ctx.beginPath();
        ctx.arc(SX[n], SY[n], SR[n], 0, TAU);
        ctx.fill();
      }
    }
  };

  const frame = (now) => {
    raf = 0;
    if (dead) return;
    const dt = reduced ? 0 : Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    draw(dt);
    if (P.alpha > 0.002) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, CANVAS, CANVAS);
  };
  return {
    P,
    ensure() {
      if (raf || dead || P.alpha <= 0.002) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    destroy() {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
    },
  };
}

export default function ThinkingOrb({ labels, done = false, onComplete, detail }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const orbRef = useRef(null);
  const playRef = useRef(null);
  const ready = useRef(false); // terminó de ensamblarse
  const finishing = useRef(false);
  const cb = useRef(onComplete);
  cb.current = onComplete;
  const [lbl, setLbl] = useState({ cur: labels[0], prev: null, n: 0 });
  const [phase, setPhase] = useState("assemble");

  // Motor de líneas de tiempo: escribe variables CSS y parámetros del orbe
  useEffect(() => {
    const root = rootRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const orb = createOrb(canvasRef.current, reduced);
    orbRef.current = orb;
    const ORB_KEYS = new Set(["k", "alpha", "spin", "sweep", "pop", "vortex", "gain", "floor", "rad"]);
    const apply = (ch, v) => {
      if (ORB_KEYS.has(ch)) {
        orb.P[ch] = v;
        if (ch === "alpha") orb.ensure();
      } else if (ch === "pulse") {
        root.style.setProperty("--pulse-o", (0.5 * (1 - v)).toFixed(3));
        root.style.setProperty("--pulse-s", (1 + v * 1.4).toFixed(3));
      } else root.style.setProperty("--" + ch, v.toFixed(4));
    };
    let cancel = () => {};
    playRef.current = (tracks, speed = 1) =>
      new Promise((res) => {
        const end = Math.max(...tracks.map((k) => k.t1));
        let t = 0,
          last = performance.now(),
          raf = 0;
        const step = (now) => {
          t += Math.min(100, now - last) * (reduced ? 4 : speed);
          last = now;
          for (const k of tracks) {
            if (t < k.t0) continue;
            const p = Math.min(1, (t - k.t0) / Math.max(1, k.t1 - k.t0));
            apply(k.ch, k.from + (k.to - k.from) * k.ease(p));
          }
          if (t >= end) res();
          else raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        cancel = () => cancelAnimationFrame(raf);
      });
    playRef.current(ASSEMBLE).then(() => {
      ready.current = true;
      setPhase("think");
    });
    return () => {
      cancel();
      orb.destroy();
    };
  }, []);

  // Etiquetas que se van turnando mientras piensa
  useEffect(() => {
    if (phase !== "think") return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % labels.length;
      if (orbRef.current) orbRef.current.P.prog = i % 4;
      setLbl((l) => ({ cur: labels[i], prev: l.cur, n: l.n + 1 }));
    }, 1150);
    return () => clearInterval(id);
  }, [phase, labels]);

  // Resultado listo: barrido, implosión y aviso al padre
  useEffect(() => {
    if (!done || phase !== "think" || finishing.current) return;
    finishing.current = true;
    (async () => {
      setPhase("resolve");
      setLbl((l) => ({ cur: "Listo", prev: l.cur, n: l.n + 1 }));
      await playRef.current(RESOLVE);
      setPhase("condense");
      await playRef.current(CONDENSE);
      cb.current?.();
    })();
  }, [done, phase]);

  const inner = (name) =>
    name === "Listo" ? (
      <span className="orb-lab-done">{name}</span>
    ) : (
      <>
        <span className="orb-lab-t">{name}</span>
        <span className="orb-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </>
    );

  return (
    <div className="orb-root" ref={rootRef} data-phase={phase} role="status" aria-live="polite">
      <div className="orb-stage">
        <span className="orb-halo" aria-hidden="true" />
        <span className="orb-ball" aria-hidden="true" />
        <canvas className="orb-canvas" ref={canvasRef} aria-hidden="true" />
        <span className="orb-core" aria-hidden="true" />
        <span className="orb-pulse" aria-hidden="true" />
      </div>
      <div className="orb-status">
        {lbl.prev !== null && (
          <span key={"p" + lbl.n} className="orb-lab orb-out" aria-hidden="true">
            {inner(lbl.prev)}
          </span>
        )}
        <span key={"c" + lbl.n} className="orb-lab orb-in">
          {inner(lbl.cur)}
        </span>
      </div>
      {detail && <p className="orb-detail">{detail}</p>}
    </div>
  );
}
