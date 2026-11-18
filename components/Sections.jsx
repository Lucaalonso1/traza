"use client";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

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
