"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CATALOG } from "@/lib/catalog";

const WORD = "TRAZA";
const T_INDEX = 0; // la cámara entra por el mástil de la T
const TITLE = [["Comparte"], ["tu", "traza."]];

// Intro: nieve blanca → la palabra TRAZA sube y deja ver la foto a través de
// sus letras → la cámara atraviesa la T y entra en la escena → el titular
// aparece palabra a palabra. Después la imagen queda estática.
// Se puede saltar, solo se reproduce una vez por sesión y respeta «reducir movimiento».
export default function Hero() {
  const maskRef = useRef(null);
  const tRef = useRef(null);
  const sceneRef = useRef(null);
  const anims = useRef([]);
  const decided = useRef(null);
  const [mode, setMode] = useState("pending"); // pending | play | done

  useEffect(() => {
    if (decided.current === null) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let seen = false;
      try {
        seen = sessionStorage.getItem("traza.intro") === "1";
        sessionStorage.setItem("traza.intro", "1");
      } catch {}
      decided.current = reduce || seen ? "done" : "play";
    }
    if (decided.current === "done") {
      setMode("done");
      return;
    }
    let cancelled = false;
    const timers = [];
    // La intro empieza cuando la foto ya está decodificada (como mucho 1,2 s de espera)
    const img = sceneRef.current?.querySelector("img");
    Promise.race([img?.decode?.().catch(() => {}), new Promise((r) => setTimeout(r, 1200))]).then(() => {
      if (!cancelled) setMode((m) => (m === "pending" ? "play" : m));
    });

    // Solo en desarrollo: ?introDebug congela la intro para revisarla fotograma a fotograma
    if (process.env.NODE_ENV !== "production" && location.search.includes("introDebug")) {
      window.__intro = { zoom: () => zoomThrough(true), anims: () => anims.current };
      return () => {};
    }

    (async () => {
      await Promise.race([Promise.all([document.fonts?.ready, img?.decode?.().catch(() => {})]), new Promise((r) => setTimeout(r, 1200))]);
      if (cancelled) return;
      timers.push(setTimeout(() => !cancelled && zoomThrough(), 1450));
    })();

    function zoomThrough(debug = false) {
      const mask = maskRef.current, t = tRef.current, scene = sceneRef.current;
      if (!mask || !t) return finish();
      const tr = t.getBoundingClientRect();
      const mr = mask.getBoundingClientRect();
      // centro del mástil de la T (un poco por debajo de la barra)
      const ox = tr.left + tr.width / 2 - mr.left;
      const oy = tr.top + tr.height * 0.62 - mr.top;
      const stem = Math.max(tr.width * 0.3, 8);
      const scale = (Math.max(mr.width, mr.height) * 2.2) / stem;
      mask.style.transformOrigin = `${ox}px ${oy}px`;
      const ease = "cubic-bezier(0.76, 0, 0.24, 1)";
      anims.current = [
        mask.animate([{ transform: "scale(1)" }, { transform: `scale(${scale})` }], { duration: 1500, easing: ease, fill: "forwards" }),
        mask.animate([{ opacity: 1 }, { opacity: 1, offset: 0.72 }, { opacity: 0 }], { duration: 1500, easing: "linear", fill: "forwards" }),
        scene?.animate([{ transform: "scale(1.32)" }, { transform: "scale(1)" }], { duration: 2100, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" }),
      ].filter(Boolean);
      if (!debug) timers.push(setTimeout(finish, 1350));
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  function finish() {
    decided.current = "done";
    setMode("done");
  }

  function skip() {
    anims.current.forEach((a) => a.finish());
    finish();
  }

  let w = 0;
  return (
    <section className={`hero is-${mode}`} aria-labelledby="hero-title">
      <div className="hero-scene" ref={sceneRef}>
        <picture className="hero-media">
          <source type="image/avif" srcSet="/media/hero/powder-1600.avif 1600w, /media/hero/powder.avif 3200w" sizes="100vw" />
          <source type="image/webp" srcSet="/media/hero/powder-1600.webp 1600w, /media/hero/powder.webp 3200w" sizes="100vw" />
          <img
            src="/media/hero/powder.jpg"
            srcSet="/media/hero/powder-1600.jpg 1600w, /media/hero/powder.jpg 3200w"
            sizes="100vw"
            alt="Esquiador levantando una nube de nieve polvo de noche, iluminado a contraluz"
            fetchPriority="high"
            decoding="async"
          />
        </picture>
      </div>
      <div className="hero-scrim" aria-hidden="true" />

      <div className="hero-copy">
        <h1 id="hero-title" className="hero-title" aria-label="Comparte tu traza.">
          {TITLE.map((line, li) => (
            <span className="ht-line" key={li} aria-hidden="true">
              {line.map((word) => (
                <span className="ht-mask" key={word}>
                  <span className={`ht-word ${word === "traza." ? "is-brand" : ""}`} style={{ "--w": w++ }}>
                    {word}
                  </span>
                </span>
              ))}
            </span>
          ))}
        </h1>
        <p className="hero-sub">
          Spots, rutas fuera de pista y clips de cada estación, compartidos por la comunidad. Y un asesor con IA que cruza
          tu perfil con {CATALOG.length} modelos para elegir tus esquís.
        </p>
        <div className="hero-actions">
          <Link href="/acceso?modo=registro" className="btn btn-primary btn-large">
            Únete a Traza
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href="/recomendador" className="btn btn-glass btn-large hero-ghost">
            Elige tu esquí
          </Link>
        </div>
      </div>

      {mode !== "done" && (
        <div className="intro" aria-hidden="true">
          <div className="intro-mask" ref={maskRef}>
            <p className="intro-word">
              {WORD.split("").map((c, i) => (
                <span className="iw-char" key={i} ref={i === T_INDEX ? tRef : undefined} style={{ "--i": i }}>
                  {c}
                </span>
              ))}
            </p>
            <p className="intro-caption">
              <span>Comunidad de esquiadores</span>
              <span>Temporada 26 / 27</span>
            </p>
          </div>
        </div>
      )}
      {mode === "play" && (
        <button className="skip-intro" onClick={skip}>
          Saltar intro
        </button>
      )}
    </section>
  );
}
