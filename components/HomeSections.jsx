"use client";
// Portada: después del hero, el «reveal» de lo que es Traza.
// Comunidad en directo → recorrido horizontal por las funciones → cifras → estaciones → cierre.
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import Avatar from "./social/Avatar";
import Icon from "./Icon";
import { timeAgo } from "@/lib/format";
import { CATALOG } from "@/lib/catalog";

const ease = [0.16, 1, 0.3, 1];
const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 40, filter: "blur(12px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-12% 0px" },
  transition: { duration: 1.1, ease, delay },
});

function Eyebrow({ children, live }) {
  return (
    <p className="eyebrow">
      {live && <span className="live-dot" aria-hidden="true" />}
      {children}
    </p>
  );
}

/* Título que entra palabra a palabra desde su ranura */
function SplitTitle({ text, accent, className = "", as: Tag = "h2", id }) {
  const words = text.split(" ");
  const acc = accent ? accent.split(" ") : [];
  return (
    <Tag className={`split-title ${className}`} id={id}>
      {[...words.map((w) => [w, false]), ...acc.map((w) => [w, true])].map(([w, a], i) => (
        <Fragment key={i}>
          <span className="st-mask">
            <motion.span
              className={`st-word ${a ? "is-accent" : ""}`}
              initial={{ y: "110%", rotate: 4 }}
              whileInView={{ y: "0%", rotate: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 1.1, ease, delay: i * 0.06 }}
            >
              {w}
            </motion.span>
          </span>{" "}
        </Fragment>
      ))}
    </Tag>
  );
}

/* ───────── 1 · La comunidad, en directo ───────── */
function FeaturedClip({ post }) {
  const ref = useRef(null);
  const video = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });
  const clipPath = useTransform(scrollYProgress, (p) => {
    const v = 14 * (1 - p);
    return `inset(${v}% ${v * 0.6}% 0% ${v * 0.6}% round ${56 - 28 * p}px)`;
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1.18, 1]);
  const media = post.medios?.[0];

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <motion.article ref={ref} className="xp-feature" style={{ clipPath }}>
      <motion.div className="xp-media" style={{ scale }}>
        {media?.tipo === "video" ? (
          <video
            ref={video}
            src={media.url}
            poster={media.poster || undefined}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={post.texto}
          />
        ) : (
          media && <img src={media.url} alt={post.texto} />
        )}
      </motion.div>
      <div className="xp-shade" aria-hidden="true" />
      <span className="xp-tag">
        <span className="live-dot" aria-hidden="true" />
        Clip destacado
      </span>
      <div className="xp-info">
        <div className="xp-who">
          <Avatar user={post} size={44} />
          <div>
            <Link href={`/u/${post.username}`} className="xp-name">
              {post.nombre}
            </Link>
            <span className="xp-meta">
              @{post.username}
              {post.estacion && <> · {post.estacion}</>} · {timeAgo(post.creadoEn)}
            </span>
          </div>
        </div>
        <p className="xp-text">{post.texto}</p>
        <div className="xp-row">
          <span className="xp-stat">
            <Icon name="heart" size={16} /> {post.likes}
          </span>
          <span className="xp-stat">
            <Icon name="comment" size={16} /> {post.comentarios}
          </span>
          <Link href={`/p/${post.id}`} className="btn btn-glass btn-small xp-open">
            Ver el clip <Icon name="arrow" size={15} />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

function MiniPost({ post, i }) {
  const m = post.medios?.[0];
  return (
    <motion.li
      initial={{ opacity: 0, x: 60, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 1, ease, delay: 0.15 + i * 0.1 }}
    >
      <Link href={`/p/${post.id}`} className="xp-mini">
        <span className="xp-thumb">
          {m?.tipo === "video" ? (
            <video src={`${m.url}#t=0.6`} poster={m.poster || undefined} muted playsInline preload="metadata" aria-hidden="true" />
          ) : m ? (
            <img src={m.url} alt="" loading="lazy" />
          ) : (
            <span className="xp-thumb-route" aria-hidden="true">
              <Icon name="route" size={26} />
            </span>
          )}
          {m?.tipo === "video" && (
            <span className="xp-play" aria-hidden="true">
              <Icon name="play" size={12} fill />
            </span>
          )}
        </span>
        <span className="xp-mini-body">
          <span className="xp-mini-who">
            <Avatar user={post} size={22} link={false} />
            {post.nombre}
          </span>
          <span className="xp-mini-text">{post.texto}</span>
          <span className="xp-mini-meta">
            {post.estacion ?? "Traza"} · {timeAgo(post.creadoEn)}
          </span>
        </span>
      </Link>
    </motion.li>
  );
}

export function ExplorePreview({ featured, posts }) {
  if (!featured) return null;
  return (
    <section className="xp" aria-labelledby="xp-title">
      <div className="xp-head">
        <div>
          <motion.div {...rise()}>
            <Eyebrow live>En directo desde la comunidad</Eyebrow>
          </motion.div>
          <SplitTitle id="xp-title" className="display" text="Lo que se está esquiando" accent="ahora." />
        </div>
        <motion.div {...rise(0.2)}>
          <Link href="/explorar" className="btn btn-glass xp-all">
            Ver todos los posts <Icon name="arrow" size={16} />
          </Link>
        </motion.div>
      </div>
      <div className="xp-grid">
        <FeaturedClip post={featured} />
        <ul className="xp-side">
          {posts.map((p, i) => (
            <MiniPost key={p.id} post={p} i={i} />
          ))}
          <motion.li {...rise(0.5)}>
            <Link href="/explorar" className="xp-more">
              <span>
                <b>Explorar</b>
                <small>Clips, fotos, rutas e informes de nieve</small>
              </span>
              <span className="xp-more-arrow" aria-hidden="true">
                <Icon name="arrow" size={20} />
              </span>
            </Link>
          </motion.li>
        </ul>
      </div>
    </section>
  );
}

/* ───────── 2 · Recorrido horizontal por las funciones ───────── */
const REEL = [
  {
    k: "Mapa",
    t: "Cada línea,",
    a: "en el mapa.",
    d: "Spots y rutas fuera de pista de cada estación, con dificultad, orientación y desnivel. Dibújalas o impórtalas en GPX.",
    img: "/media/home/mapa.webp",
    href: "/mapa",
    cta: "Abrir el mapa",
  },
  {
    k: "Nieve",
    t: "La nieve de hoy,",
    a: "de primera mano.",
    d: "Informes de quien ha esquiado esta mañana: tipo de nieve, calidad y avisos, junto al boletín oficial de aludes.",
    img: "/media/home/estacion.webp",
    href: "/estaciones",
    cta: "Ver estaciones",
  },
  {
    k: "Rutas",
    t: "Antes de ir,",
    a: "mírala por dentro.",
    d: "Cada spot con su traza sobre el terreno, los clips de quien la ha bajado y los spots cercanos.",
    img: "/media/home/spot.webp",
    href: "/mapa",
    cta: "Buscar rutas",
  },
  {
    k: "Esquís",
    t: `${CATALOG.length} modelos.`,
    a: "Uno es el tuyo.",
    d: "La IA cruza tu físico, tu nivel y tu estilo con el catálogo y con lo que puntúan los esquiadores como tú.",
    skis: ["/media/skis/blizzard-rustler-10.png", "/media/skis/volkl-mantra-m7.png", "/media/skis/armada-arv-94.png"],
    href: "/recomendador",
    cta: "Elige tu esquí",
  },
];

function ReelPanel({ item, i, progress, n }) {
  // cada panel tiene su tramo del scroll: el visual se desplaza en sentido contrario (paralaje)
  const start = i / n,
    end = (i + 1) / n;
  const x = useTransform(progress, [start - 1 / n, end], ["14%", "-14%"]);
  const rot = useTransform(progress, [start - 1 / n, start, end], [-6, 0, 4]);
  return (
    <article className="reel-panel" aria-roledescription="diapositiva" aria-label={`${i + 1} de ${n}: ${item.k}`}>
      <div className="reel-copy">
        <span className="reel-num">
          {String(i + 1).padStart(2, "0")}
          <i>{item.k}</i>
        </span>
        <h3 className="reel-title">
          {item.t} <em>{item.a}</em>
        </h3>
        <p>{item.d}</p>
        <Link href={item.href} className="btn btn-primary">
          {item.cta} <Icon name="arrow" size={16} />
        </Link>
      </div>
      <div className="reel-visual">
        {item.img ? (
          <motion.div className="reel-shot" style={{ x }}>
            <img src={item.img} alt="" loading="lazy" />
          </motion.div>
        ) : (
          <div className="reel-skis">
            {item.skis.map((src, j) => (
              <motion.img key={src} src={src} alt="" loading="lazy" style={{ x, rotate: rot, "--j": j }} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function FeatureReel() {
  const ref = useRef(null);
  const n = REEL.length;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.4,
  });
  const x = useTransform(smooth, [0, 1], ["0vw", `-${(n - 1) * 100}vw`]);
  const bar = useTransform(smooth, [0, 1], [1 / n, 1]);
  const [idx, setIdx] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setIdx(Math.min(n - 1, Math.floor(v * n * 0.999))));

  return (
    <section className="reel" ref={ref} style={{ height: `${n * 100}vh` }} aria-labelledby="reel-title">
      <div className="reel-sticky">
        <div className="reel-top">
          <h2 id="reel-title" className="reel-label">
            Todo lo que pasa en la montaña
          </h2>
          <span className="reel-count num">
            {String(idx + 1).padStart(2, "0")} <i>/ {String(n).padStart(2, "0")}</i>
          </span>
        </div>
        <motion.div className="reel-track" style={{ x, width: `${n * 100}vw` }}>
          {REEL.map((item, i) => (
            <ReelPanel key={item.k} item={item} i={i} n={n} progress={smooth} />
          ))}
        </motion.div>
        <div className="reel-progress" aria-hidden="true">
          <motion.span style={{ scaleX: bar }} />
        </div>
      </div>
    </section>
  );
}

/* ───────── 3 · Cifras ───────── */
function Count({ to }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, {
      duration: 1.8,
      ease,
      onUpdate: (x) => setV(Math.round(x)),
    });
    return () => c.stop();
  }, [inView, to]);
  return (
    <span ref={ref} className="num">
      {v.toLocaleString("es-ES")}
    </span>
  );
}

export function Stats({ stats }) {
  if (!stats) return null;
  const items = [
    [stats.estaciones, "estaciones", "de los Pirineos a los Alpes"],
    [stats.spots, "spots y rutas", "dibujados por la comunidad"],
    [stats.publicaciones, "publicaciones", "clips, fotos e informes"],
    [stats.esquiadores, "esquiadores", "y sus gemelos de nieve"],
  ];
  return (
    <section className="stats" aria-label="Traza en cifras">
      <ul>
        {items.map(([v, l, d], i) => (
          <motion.li key={l} {...rise(i * 0.08)}>
            <b>
              <Count to={Number(v) || 0} />
            </b>
            <span>{l}</span>
            <small>{d}</small>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

/* ───────── 4 · Estaciones en marquesina ───────── */
export function StationsMarquee({ stations = [] }) {
  if (!stations.length) return null;
  const rows = [stations, [...stations].reverse()];
  return (
    <section className="marquee-sec" aria-labelledby="mq-title">
      <div className="mq-head">
        <motion.div {...rise()}>
          <Eyebrow>Estaciones</Eyebrow>
        </motion.div>
        <SplitTitle id="mq-title" className="display" text="¿Dónde esquías" accent="tú?" />
      </div>
      {rows.map((row, r) => (
        <div className={`marquee ${r ? "is-reverse" : ""}`} key={r}>
          <div className="marquee-track">
            {[0, 1].map((dup) => (
              <ul key={dup} aria-hidden={dup ? "true" : undefined}>
                {row.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/estaciones/${s.slug}`} tabIndex={dup ? -1 : undefined}>
                      <span className="mq-name">{s.nombre}</span>
                      <span className="mq-meta num">
                        {s.cotaMax?.toLocaleString("es-ES")} m · {s.spots} spots
                      </span>
                    </Link>
                    <span className="mq-sep" aria-hidden="true" />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      ))}
      <motion.div className="mq-actions" {...rise(0.1)}>
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
