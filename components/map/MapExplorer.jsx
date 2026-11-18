"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import MapView from "./MapView";
import Icon from "../Icon";
import { DIFICULTAD, n } from "@/lib/format";

const coordsOf = (s) => (s.geom.type === "Point" ? [s.geom.coordinates] : s.geom.coordinates);

export default function MapExplorer({ stations, spots }) {
  const [diff, setDiff] = useState("todas");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [fit, setFit] = useState(() => stations.map((s) => [s.lng, s.lat]));

  const visible = useMemo(() => {
    const t = query.trim().toLowerCase();
    return spots.filter(
      (s) => (diff === "todas" || s.dificultad === diff) && (!t || `${s.nombre} ${s.estacion}`.toLowerCase().includes(t))
    );
  }, [spots, diff, query]);
  const current = spots.find((s) => s.id === selected);

  function pick(id) {
    const s = spots.find((x) => x.id === id);
    if (!s) return;
    setSelected(id);
    setFit(coordsOf(s));
  }

  return (
    <div className="map-page">
      <MapView
        className="map-full"
        stations={stations}
        spots={visible}
        selected={selected}
        fit={fit}
        onSpot={pick}
        onStation={(s) => {
          setSelected(null);
          setFit([[s.lng, s.lat]]);
        }}
      />

      <aside className="map-panel" aria-label="Spots y rutas">
        <div className="map-panel-head">
          <h1 className="map-title">Mapa</h1>
          <p className="muted small">
            {n(spots.length)} spots y rutas en {n(stations.length)} estaciones
          </p>
          <label className="sr-only" htmlFor="map-q">
            Buscar spot o estación
          </label>
          <input id="map-q" className="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar spot o estación" />
          <div className="chips-row" role="group" aria-label="Filtrar por dificultad">
            {["todas", ...Object.keys(DIFICULTAD)].map((k) => (
              <button key={k} className={`chip ${diff === k ? "is-on" : ""}`} aria-pressed={diff === k} onClick={() => setDiff(k)}>
                {k !== "todas" && <i className={`diff-dot d-${k}`} />}
                {k === "todas" ? "Todas" : DIFICULTAD[k].label}
              </button>
            ))}
          </div>
        </div>
        <ul className="spot-list">
          {visible.map((s) => (
            <li key={s.id}>
              <button className={`spot-row ${selected === s.id ? "is-on" : ""}`} onClick={() => pick(s.id)}>
                <i className={`diff-dot d-${s.dificultad}`} />
                <span className="spot-row-main">
                  <b>{s.nombre}</b>
                  <span>
                    {s.estacion} · {s.tipo === "ruta" ? "Ruta" : "Spot"} · {s.orientacion}
                    {s.desnivel ? ` · ${n(s.desnivel)} m` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {visible.length === 0 && <li className="muted small spot-empty">No hay spots con ese filtro.</li>}
        </ul>
        <Link href="/publicar?tipo=spot" className="btn btn-primary btn-block">
          <Icon name="plus" size={18} /> Añadir spot o ruta
        </Link>
      </aside>

      {current && (
        <div className="map-card" role="dialog" aria-label={current.nombre}>
          <button className="map-card-close" onClick={() => setSelected(null)} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
          <p className="map-card-kind">
            <i className={`diff-dot d-${current.dificultad}`} /> {DIFICULTAD[current.dificultad].label} · {current.estacion}
          </p>
          <h2>{current.nombre}</h2>
          <p className="muted small clamp-3">{current.descripcion}</p>
          <Link href={`/spots/${current.id}`} className="btn btn-glass btn-small">
            Ver detalles <Icon name="arrow" size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
