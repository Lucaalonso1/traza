"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "@/lib/auth";
import { LEVELS, STYLES } from "@/lib/catalog";
import { skiImage } from "@/lib/ski-images";

export default function Garage() {
  const { user, ready, garage, removeSki, restoreSki, updateNote } = useAuth();
  const [filter, setFilter] = useState("todos");
  const [undo, setUndo] = useState(null);
  const timer = useRef();

  const cats = useMemo(() => ["todos", ...new Set(garage.map((g) => g.categoria))], [garage]);
  const list = filter === "todos" ? garage : garage.filter((g) => g.categoria === filter);

  function remove(item) {
    const index = garage.findIndex((g) => g.id === item.id);
    removeSki(item.id);
    clearTimeout(timer.current);
    setUndo({ item, index });
    timer.current = setTimeout(() => setUndo(null), 5000);
  }

  if (!ready) return <div className="page" />;

  if (!user)
    return (
      <div className="page page-narrow">
        <div className="empty">
          <h1 className="page-title">Tu garaje te espera</h1>
          <p className="muted">Entra o crea una cuenta para guardar los esquís que te recomiende Traza.</p>
          <div className="empty-actions">
            <Link className="btn btn-primary" href="/acceso?next=/garaje">
              Entrar
            </Link>
            <Link className="btn btn-ghost" href="/recomendador">
              Probar el recomendador
            </Link>
          </div>
        </div>
      </div>
    );

  return (
    <div className="page">
      <header className="garage-head">
        <div>
          <h1 className="page-title">
            {garage.length === 0 ? "Aún no hay esquís aquí" : `${garage.length} ${garage.length === 1 ? "par guardado" : "pares guardados"}`}
          </h1>
        </div>
        <Link className="btn btn-primary" href="/recomendador">
          Nueva recomendación
        </Link>
      </header>

      {garage.length === 0 ? (
        <div className="empty">
          <p className="muted">Pide recomendaciones y pulsa «Guardar en garaje» en los que te gusten.</p>
          <Link className="btn btn-ghost" href="/recomendador">
            Ir al recomendador
          </Link>
        </div>
      ) : (
        <>
          {cats.length > 2 && (
            <div className="segmented" role="tablist" aria-label="Filtrar por categoría">
              {cats.map((c) => (
                <button key={c} role="tab" aria-selected={filter === c} onClick={() => setFilter(c)}>
                  {c === "todos" ? "Todos" : c}
                </button>
              ))}
            </div>
          )}
          <motion.ul layout className="garage-grid">
            <AnimatePresence>
              {list.map((s) => (
                <motion.li
                  layout
                  key={s.id}
                  className="garage-card"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                >
                  {skiImage(s.marca, s.modelo) && (
                    <div className="garage-visual">
                      <img src={skiImage(s.marca, s.modelo)} alt="" loading="lazy" />
                    </div>
                  )}
                  <div className="garage-top">
                    <div>
                      <p className="ski-brand">{s.marca}</p>
                      <h2 className="ski-model">{s.modelo}</h2>
                      <p className="ski-meta">{s.categoria}</p>
                    </div>
                    <span className="garage-fit" aria-label={`Encaje ${s.encaje} de 100`}>
                      {s.encaje}
                    </span>
                  </div>
                  <dl className="specs specs-row">
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
                  <p className="ski-why">{s.porQue}</p>
                  {s.profile && (
                    <p className="muted small">
                      Para {s.profile.height} cm · {s.profile.weight} kg · {LEVELS[s.profile.level]?.label} ·{" "}
                      {STYLES[s.profile.style]?.label}
                    </p>
                  )}
                  <label className="note">
                    <span className="sr-only">Nota para {s.modelo}</span>
                    <input
                      type="text"
                      placeholder="Añade una nota: precio visto, tienda…"
                      defaultValue={s.note || ""}
                      onBlur={(e) => e.target.value !== (s.note || "") && updateNote(s.id, e.target.value)}
                    />
                  </label>
                  <button className="link-danger" onClick={() => remove(s)}>
                    Quitar del garaje
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </>
      )}

      <AnimatePresence>
        {undo && (
          <motion.div className="toast" role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
            {undo.item.modelo} quitado del garaje
            <button
              onClick={() => {
                restoreSki(undo.item, undo.index);
                setUndo(null);
              }}
            >
              Deshacer
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
