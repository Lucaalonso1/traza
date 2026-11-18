"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CATALOG, LEVELS, STYLES } from "@/lib/catalog";
import { recommendedLength } from "@/lib/engine";
import { useAuth } from "@/lib/auth";
import { NIEVE } from "@/lib/format";
import { skiImage } from "@/lib/ski-images";
import ThinkingOrb from "./ui/thinking-orb";

const STEPS = ["Tu físico", "Tu nivel", "Tu estilo", "Detalles"];
const EXAMPLES = [
  "Esquío sobre todo en Sierra Nevada, con mucha nieve primavera",
  "Quiero un esquí para empezar a salir fuera de pista",
  "Busco algo fácil para mi primera temporada completa",
  "Me gusta ir rápido y hacer giros largos",
];
const LOADING_LINES = ["Leyendo tu perfil", `Comparando ${CATALOG.length} modelos`, "Preguntando a la comunidad", "Ajustando longitudes", "Eligiendo tus esquís"];
const LAST = "altura.lastResult";

const slide = {
  initial: (d) => ({ opacity: 0, x: d * 48 }),
  animate: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.2, 0.7, 0.2, 1] } },
  exit: (d) => ({ opacity: 0, x: d * -48, transition: { duration: 0.25 } }),
};

export default function Recommender() {
  const params = useSearchParams();
  const initialStyle = STYLES[params.get("estilo")] ? params.get("estilo") : null;

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [profile, setProfile] = useState({ height: 175, weight: 72, level: null, style: initialStyle, notes: "" });
  const [phase, setPhase] = useState("form"); // form | loading | results
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(null); // resultado listo mientras el orbe termina
  const [error, setError] = useState("");
  const topRef = useRef(null);

  // Recupera el último resultado (por ejemplo, al volver tras iniciar sesión)
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(LAST) || "null");
      if (saved && !initialStyle) {
        setProfile(saved.profile);
        setResult(saved.result);
        setPhase("results");
      }
    } catch {}
  }, [initialStyle]);

  // Si tienes el físico en tu perfil, empezamos con él
  const { user } = useAuth();
  useEffect(() => {
    if (!user || phase !== "form") return;
    setProfile((p) => ({
      ...p,
      height: user.altura_cm ?? p.height,
      weight: user.peso_kg ?? p.weight,
      level: p.level ?? user.nivel ?? null,
      style: p.style ?? user.estilo ?? null,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const set = (k, v) => setProfile((p) => ({ ...p, [k]: v }));
  const canNext = [true, profile.level !== null, profile.style !== null, true][step];

  const go = (to) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
    setError("");
  };

  async function submit() {
    setPending(null);
    setPhase("loading");
    setError("");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const started = Date.now();
    try {
      const res = await fetch("/api/recomendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No he podido generar recomendaciones.");
      const wait = Math.max(0, 3400 - (Date.now() - started)); // deja pensar al orbe
      await new Promise((r) => setTimeout(r, wait));
      setPending(data);
    } catch (e) {
      setError(e.message || "Algo ha fallado. Vuelve a intentarlo.");
      setPhase("form");
    }
  }

  function reveal() {
    setResult(pending);
    setPending(null);
    setPhase("results");
    try {
      sessionStorage.setItem(LAST, JSON.stringify({ profile, result: pending }));
    } catch {}
  }

  function editProfile() {
    setPhase("form");
    go(0);
  }

  return (
    <div className="rec" ref={topRef}>
      <AnimatePresence mode="wait">
        {phase === "form" && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <header className="rec-head">
              <h1 className="page-title">Vamos a encontrar tus esquís</h1>
            </header>

            <ol className="progress" aria-label="Pasos">
              {STEPS.map((s, i) => (
                <li key={s} className={i === step ? "is-current" : i < step ? "is-done" : ""} aria-current={i === step ? "step" : undefined}>
                  <button type="button" onClick={() => i < step && go(i)} disabled={i > step}>
                    <span className="progress-bar" />
                    <span className="progress-label">{s}</span>
                  </button>
                </li>
              ))}
            </ol>

            <div className="rec-card">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div key={step} custom={dir} variants={slide} initial="initial" animate="animate" exit="exit">
                  {step === 0 && <BodyStep profile={profile} set={set} />}
                  {step === 1 && (
                    <Choice
                      legend="¿Cómo esquías hoy?"
                      hint="Sé sincero: un esquí demasiado exigente frena más que ayuda."
                      options={LEVELS.map((l) => ({ id: l.id, label: l.label, short: l.short, meter: l.id + 1 }))}
                      value={profile.level}
                      onChange={(v) => set("level", v)}
                    />
                  )}
                  {step === 2 && (
                    <Choice
                      legend="¿Dónde pasas más horas?"
                      hint="Elige el terreno principal; Traza buscará esquís que también cubran el resto."
                      options={Object.entries(STYLES).map(([id, s]) => ({ id, label: s.label, short: s.short }))}
                      value={profile.style}
                      onChange={(v) => set("style", v)}
                    />
                  )}
                  {step === 3 && <NotesStep profile={profile} set={set} />}
                </motion.div>
              </AnimatePresence>

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              <div className="rec-nav">
                {step > 0 ? (
                  <button className="btn btn-ghost" onClick={() => go(step - 1)}>
                    Atrás
                  </button>
                ) : (
                  <span />
                )}
                {step < STEPS.length - 1 ? (
                  <button className="btn btn-primary" onClick={() => go(step + 1)} disabled={!canNext}>
                    Continuar
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={submit}>
                    Encontrar mis esquís
                  </button>
                )}
              </div>
            </div>
            <p className="ai-note">
              Traza usa un modelo de IA para elegir y explicar los esquís. Solo enviamos tu altura, peso, nivel, estilo y las notas que escribas.
            </p>
          </motion.div>
        )}

        {phase === "loading" && <Loading key="loading" profile={profile} done={!!pending} onComplete={reveal} />}

        {phase === "results" && result && (
          <Results key="results" result={result} profile={profile} onEdit={editProfile} onRetry={submit} />
        )}
      </AnimatePresence>
    </div>
  );
}

function BodyStep({ profile, set }) {
  const len = recommendedLength({ ...profile, level: profile.level ?? 1, style: profile.style ?? "allmountain" });
  return (
    <div className="body-step">
      <div className="body-fields">
        <Range label="Altura" unit="cm" min={140} max={210} value={profile.height} onChange={(v) => set("height", v)} />
        <Range label="Peso" unit="kg" min={40} max={130} value={profile.weight} onChange={(v) => set("weight", v)} />
        <p className="muted small">
          Con tu físico, la longitud orientativa ronda los <strong>{len} cm</strong>. Tu nivel y tu estilo la afinarán.
        </p>
      </div>
      <SkiFigure height={profile.height} length={len} />
    </div>
  );
}

function Range({ label, unit, min, max, value, onChange }) {
  const id = `r-${label}`;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="range">
      <div className="range-top">
        <label htmlFor={id}>{label}</label>
        <span className="range-value">
          <input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={value}
            aria-label={`${label} en ${unit}`}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
            }}
          />
          <span>{unit}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        style={{ "--pct": `${pct}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function SkiFigure({ height, length }) {
  const ground = 236;
  const h = height; // 1 px = 1 cm
  const top = ground - h;
  return (
    <figure className="ski-figure" aria-label={`Tú mides ${height} cm; esquí orientativo de ${length} cm`}>
      <svg viewBox="0 0 220 250" role="img" aria-hidden="true">
        <line x1="10" x2="210" y1={ground} y2={ground} className="fig-ground" />
        {[140, 160, 180, 200].map((m) => (
          <g key={m}>
            <line x1="14" x2="206" y1={ground - m} y2={ground - m} className="fig-grid" />
            <text x="206" y={ground - m - 3} className="fig-tick" textAnchor="end">
              {m}
            </text>
          </g>
        ))}
        <motion.g animate={{ y: top }} initial={false} transition={{ type: "spring", stiffness: 140, damping: 20 }}>
          <circle cx="78" cy={h * 0.065} r={h * 0.065} className="fig-person" />
          <rect x={78 - h * 0.1} y={h * 0.14} width={h * 0.2} height={h * 0.42} rx={h * 0.06} className="fig-person" />
          <rect x={78 - h * 0.09} y={h * 0.52} width={h * 0.08} height={h * 0.48} rx={h * 0.03} className="fig-person" />
          <rect x={78 + h * 0.01} y={h * 0.52} width={h * 0.08} height={h * 0.48} rx={h * 0.03} className="fig-person" />
        </motion.g>
        <motion.g animate={{ y: ground - length }} initial={false} transition={{ type: "spring", stiffness: 140, damping: 20 }}>
          <path d={`M132 10 Q132 0 140 0 Q148 0 148 10 L148 ${length - 4} Q148 ${length} 144 ${length} L136 ${length} Q132 ${length} 132 ${length - 4} Z`} className="fig-ski" />
          <line x1="140" x2="140" y1="14" y2={length - 8} className="fig-ski-line" />
        </motion.g>
      </svg>
      <figcaption>
        <span>
          Tú <strong>{height} cm</strong>
        </span>
        <span className="accent">
          Esquí <strong>{length} cm</strong>
        </span>
      </figcaption>
    </figure>
  );
}

function Choice({ legend, hint, options, value, onChange }) {
  return (
    <fieldset className="choice">
      <legend className="step-title">{legend}</legend>
      <p className="muted">{hint}</p>
      <div className="choice-grid">
        {options.map((o) => (
          <label key={o.id} className={`choice-item ${value === o.id ? "is-on" : ""}`}>
            <input type="radio" name={legend} checked={value === o.id} onChange={() => onChange(o.id)} />
            {o.meter && (
              <span className="meter" aria-hidden="true">
                {[1, 2, 3, 4].map((n) => (
                  <i key={n} className={n <= o.meter ? "on" : ""} />
                ))}
              </span>
            )}
            <span className="choice-label">{o.label}</span>
            <span className="choice-short">{o.short}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function NotesStep({ profile, set }) {
  return (
    <div className="notes-step">
      <label className="step-title" htmlFor="notes">
        ¿Algo más que debamos saber?
      </label>
      <p className="muted">Opcional. Dónde esquías, qué te gusta, qué esquí llevas ahora…</p>
      <textarea
        id="notes"
        rows={4}
        maxLength={400}
        value={profile.notes}
        placeholder="Por ejemplo: llevo dos temporadas con esquís de alquiler y quiero mi primer par propio."
        onChange={(e) => set("notes", e.target.value)}
      />
      <div className="chips" aria-label="Ejemplos">
        {EXAMPLES.map((e) => (
          <button type="button" key={e} className="chip" onClick={() => set("notes", e)}>
            {e}
          </button>
        ))}
      </div>
      <dl className="summary">
        <div>
          <dt>Físico</dt>
          <dd>
            {profile.height} cm · {profile.weight} kg
          </dd>
        </div>
        <div>
          <dt>Nivel</dt>
          <dd>{LEVELS[profile.level]?.label}</dd>
        </div>
        <div>
          <dt>Estilo</dt>
          <dd>{STYLES[profile.style]?.label}</dd>
        </div>
      </dl>
    </div>
  );
}

function Loading({ profile, done, onComplete }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
      <ThinkingOrb
        labels={LOADING_LINES}
        done={done}
        onComplete={onComplete}
        detail={`${profile.height} cm · ${profile.weight} kg · ${LEVELS[profile.level]?.label} · ${STYLES[profile.style]?.label}`}
      />
    </motion.div>
  );
}

function Results({ result, profile, onEdit, onRetry }) {
  const { user, saveSki, isSaved } = useAuth();
  const [toast, setToast] = useState("");
  const sourceText = useMemo(
    () =>
      result.source === "ia"
        ? "Generado con IA (Claude)"
        : "Generado con el motor de catálogo de Traza",
    [result.source]
  );

  function save(ski) {
    if (saveSki(ski, profile)) {
      setToast(`${ski.marca} ${ski.modelo} guardado en tu garaje`);
      setTimeout(() => setToast(""), 2600);
    }
  }

  return (
    <motion.div className="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <header className="results-head">
        <h1 className="page-title">{result.resumen}</h1>
        <p className="source">
          <span className={`dot ${result.source}`} aria-hidden="true" />
          {sourceText}
          {result.source !== "ia" && (
            <span className="muted"> · Añade una clave de Anthropic para activar el agente de IA.</span>
          )}
        </p>
        <div className="results-actions">
          <button className="btn btn-ghost" onClick={onEdit}>
            Editar perfil
          </button>
          <button className="btn btn-ghost" onClick={onRetry}>
            Volver a generar
          </button>
        </div>
      </header>

      <ol className="ski-list">
        {result.esquis.map((s, i) => {
          const saved = isSaved(s);
          return (
            <motion.li
              key={`${s.marca}-${s.modelo}`}
              className="ski-card"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 * i, duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <div className="ski-visual">
                <span className="ski-rank" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {skiImage(s.marca, s.modelo) ? (
                  <motion.img
                    src={skiImage(s.marca, s.modelo)}
                    alt={`${s.marca} ${s.modelo}`}
                    className="ski-img"
                    initial={{ opacity: 0, x: 80, rotate: 2, filter: "blur(8px)" }}
                    animate={{ opacity: 1, x: 0, rotate: 0, filter: "blur(0px)" }}
                    transition={{ delay: 0.15 + 0.12 * i, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  />
                ) : (
                  <span className="ski-img-fallback" aria-hidden="true" />
                )}
                <span className="ski-cat">{s.categoria}</span>
              </div>
              <div className="ski-main">
                <p className="ski-brand">{s.marca}</p>
                <h2 className="ski-model">{s.modelo}</h2>
                <p className="ski-meta">{s.nivel}</p>
                <p className="ski-why">{s.porQue}</p>
                <ul className="ski-tags">
                  {s.puntosFuertes.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <p className="ski-caveat">
                  <strong>A tener en cuenta:</strong> {s.aTenerEnCuenta}
                </p>
                {s.comunidad && (
                  <p className="ski-community">
                    <span className="num">{String(s.comunidad.media).replace(".", ",")}</span>
                    <span>
                      de 5 · {s.comunidad.votos} valoraciones de {s.comunidad.similar ? "esquiadores parecidos a ti" : "la comunidad"} · mejor en nieve{" "}
                      {NIEVE[s.comunidad.mejorNieve]?.toLowerCase()}
                    </span>
                  </p>
                )}
              </div>
              <div className="ski-side">
                <div className="fit" aria-label={`Encaje ${s.encaje} de 100`}>
                  <svg viewBox="0 0 44 44" aria-hidden="true">
                    <circle cx="22" cy="22" r="19" className="fit-bg" />
                    <motion.circle
                      cx="22"
                      cy="22"
                      r="19"
                      className="fit-fg"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: s.encaje / 100 }}
                      transition={{ delay: 0.3 + 0.12 * i, duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}
                    />
                  </svg>
                  <span>{s.encaje}</span>
                  <small>encaje</small>
                </div>
                <dl className="specs">
                  <div>
                    <dt>Longitud</dt>
                    <dd>{s.longitudCm} cm</dd>
                  </div>
                  <div>
                    <dt>Patín</dt>
                    <dd>{s.patinMm} mm</dd>
                  </div>
                  <div>
                    <dt>Radio</dt>
                    <dd>{s.radioM} m</dd>
                  </div>
                </dl>
                {user ? (
                  <button className={`btn ${saved ? "btn-saved" : "btn-primary"}`} onClick={() => save(s)} disabled={saved}>
                    {saved ? "Guardado" : "Guardar en garaje"}
                  </button>
                ) : (
                  <Link className="btn btn-ghost" href="/acceso?next=/recomendador">
                    Entra para guardar
                  </Link>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
      <p className="ai-note">
        Las recomendaciones son orientativas y pueden contener errores en medidas o tallas. Confírmalas con el fabricante o en tienda.
      </p>
      <AnimatePresence>
        {toast && (
          <motion.div className="toast" role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
            {toast} · <Link href="/garaje">Ver garaje</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
