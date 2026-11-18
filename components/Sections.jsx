"use client";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { CATALOG } from "@/lib/catalog";

const ease = [0.16, 1, 0.3, 1];
const reveal = {
  initial: { opacity: 0, y: 36, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-10% 0px" },
  transition: { duration: 0.9, ease },
};

function Word({ children, progress, range, accent }) {
  const opacity = useTransform(progress, range, [0.12, 1]);
  return (
    <motion.span style={{ opacity }} className={accent ? "m-word m-accent" : "m-word"}>
      {children}{" "}
    </motion.span>
  );
}

const MANIFESTO = [
  ["Cada", "estación", "guarda", "líneas", "que", "solo", "conocen", "los", "que", "la", "esquían."],
  ["Traza", "las", "pone", "en", "el", "mapa,", "con", "sus", "clips", "y", "la", "nieve", "de", "hoy,"],
  ["*contadas", "*por", "*quien", "*las", "*baja."],
];

export function Manifesto() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.4"] });
  const words = MANIFESTO.flat();
  let k = 0;
  return (
    <section className="manifesto" ref={ref}>
      <p className="manifesto-text">
        {MANIFESTO.map((line, li) => (
          <span key={li} className="m-line">
            {line.map((w) => {
              const i = k++;
              const accent = w.startsWith("*");
              return (
                <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} accent={accent}>
                  {accent ? w.slice(1) : w}
                </Word>
              );
            })}
          </span>
        ))}
      </p>
    </section>
  );
}

const STEPS = [
  { t: "Un mapa hecho por esquiadores", d: "Spots y rutas fuera de pista de cada estación, con dificultad, orientación y desnivel. Dibújalas o impórtalas en GPX.", k: "Mapa" },
  { t: "Clips de cada línea", d: "Sube tus vídeos y fotos y enlázalos al spot. Antes de ir, mira cómo es por dentro.", k: "Comunidad" },
  { t: "La nieve de hoy, de primera mano", d: "Informes de quien ha esquiado esta mañana: tipo de nieve, calidad y avisos.", k: "Nieve" },
  { t: "Tus gemelos de nieve", d: "Traza te presenta a esquiadores con tu físico, tu nivel y tu estilo. Sigue sus líneas.", k: "Gemelos" },
  { t: `Elige tu esquí con ${CATALOG.length} modelos y la opinión real`, d: "La IA cruza tu perfil con el catálogo y con lo que puntúan los esquiadores como tú.", k: "Esquís" },
];

function StepCard({ step, i, total }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1 - (total - i) * 0.03]);
  const dim = useTransform(scrollYProgress, [0, 1], [0, 0.45]);
  return (
    <li ref={ref} className="stack-item" style={{ "--i": i }}>
      <motion.article className="stack-card" style={{ scale }}>
        <motion.span className="stack-dim" style={{ opacity: dim }} aria-hidden="true" />
        <div className="stack-num" aria-hidden="true">
          <b>{i + 1}</b>
          <span>{step.k}</span>
        </div>
        <div className="stack-body">
          <h3>{step.t}</h3>
          <p>{step.d}</p>
        </div>
      </motion.article>
    </li>
  );
}

export function HowItWorks() {
  return (
    <section className="how" id="como-funciona" aria-labelledby="how-title">
      <motion.div className="section-head" {...reveal}>
        <h2 id="how-title" className="section-title">
          Todo lo que pasa <em>en la montaña</em>
        </h2>
      </motion.div>
      <ol className="stack">
        {STEPS.map((s, i) => (
          <StepCard key={s.t} step={s} i={i} total={STEPS.length} />
        ))}
      </ol>
    </section>
  );
}

const RIDGES = {
  pista: "M0 70 L40 62 L80 50 L120 40 L160 30 L200 22",
  allmountain: "M0 70 L30 52 L60 60 L95 34 L130 46 L165 24 L200 36",
  fuerapista: "M0 72 L25 48 L50 58 L80 26 L110 44 L140 18 L170 40 L200 30",
  freeride: "M0 76 L30 40 L45 52 L75 12 L100 46 L130 20 L160 56 L200 26",
  park: "M0 64 L40 64 L60 40 L80 64 L120 64 L140 30 L160 64 L200 64",
};

const RIDGE_LIST = Object.values(RIDGES);

export function StationsGrid({ stations = [] }) {
  return (
    <section className="styles" aria-labelledby="styles-title">
      <motion.div className="section-head row" {...reveal}>
        <h2 id="styles-title" className="section-title">
          ¿Dónde esquías <em>tú?</em>
        </h2>
        <p className="muted head-note">Spots, clips y la nieve de hoy en cada estación.</p>
      </motion.div>
      <div className="style-cards">
        {stations.slice(0, 5).map((s, i) => (
          <motion.div key={s.slug} {...reveal} transition={{ ...reveal.transition, delay: i * 0.06 }}>
            <Link href={`/estaciones/${s.slug}`} className="style-card">
              <svg viewBox="0 0 200 80" className="ridge" aria-hidden="true" preserveAspectRatio="none">
                <path d={`${RIDGE_LIST[i % RIDGE_LIST.length]} L200 80 L0 80 Z`} className="ridge-fill" />
                <path d={RIDGE_LIST[i % RIDGE_LIST.length]} className="ridge-line" />
              </svg>
              <span className="style-name">{s.nombre}</span>
              <span className="style-short">
                {s.region} · {s.cotaMax.toLocaleString("es-ES")} m
              </span>
              <span className="style-go">
                {s.spots} spots · {s.publicaciones} clips
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
      <motion.div {...reveal} className="section-more">
        <Link href="/estaciones" className="btn btn-glass">
          Ver todas las estaciones
        </Link>
        <Link href="/mapa" className="btn btn-glass">
          Abrir el mapa
        </Link>
      </motion.div>
    </section>
  );
}

export function FinalCta() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  return (
    <section className="final-cta" ref={ref}>
      <motion.div className="final-media" style={{ y }}>
        <video src="/media/alpenglow.mp4" poster="/media/alpenglow.jpg" autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
      </motion.div>
      <div className="final-scrim" aria-hidden="true" />
      <motion.div className="final-inner" {...reveal}>
        <h2 className="final-title">
          Tu próxima traza <em>empieza aquí.</em>
        </h2>
        <Link href="/acceso?modo=registro" className="btn btn-primary btn-large">
          Únete a Traza
        </Link>
      </motion.div>
    </section>
  );
}
