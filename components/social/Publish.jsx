"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MapView from "../map/MapView";
import Icon from "../Icon";
import { useAuth, api } from "@/lib/auth";
import { DIFICULTAD, NIEVE, ORIENTACIONES } from "@/lib/format";

const TABS = [
  ["media", "Clip o foto"],
  ["spot", "Spot o ruta"],
  ["informe", "Informe de nieve"],
];

// Lee los puntos de una traza GPX (trkpt o rtept)
function parseGPX(text) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const pts = [...doc.querySelectorAll("trkpt, rtept")].map((p) => [+(+p.getAttribute("lon")).toFixed(6), +(+p.getAttribute("lat")).toFixed(6)]);
  // Simplifica a como mucho 300 puntos
  const step = Math.max(1, Math.ceil(pts.length / 300));
  return pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
}

export default function Publish({ stations, spots }) {
  const params = useSearchParams();
  const router = useRouter();
  const { user, ready } = useAuth();
  const initialStation = stations.find((s) => String(s.id) === params.get("estacion") || s.slug === params.get("estacion"));
  const [tab, setTab] = useState(params.get("tipo") === "spot" ? "spot" : params.get("tipo") === "informe" ? "informe" : "media");
  const [estacion, setEstacion] = useState(initialStation ? String(initialStation.id) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Clip o foto
  const [files, setFiles] = useState([]);
  const [texto, setTexto] = useState("");
  const [spotId, setSpotId] = useState(params.get("spot") ?? "");
  const previews = useMemo(() => files.map((f) => ({ url: URL.createObjectURL(f), video: f.type.startsWith("video") })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  // Spot o ruta
  const [draft, setDraft] = useState([]);
  const [sp, setSp] = useState({ nombre: "", dificultad: "", orientacion: "", desnivel: "", descripcion: "" });
  const est = stations.find((s) => String(s.id) === estacion);
  const fit = useMemo(() => (est ? [[est.lng, est.lat]] : stations.map((s) => [s.lng, s.lat])), [est, stations]);

  // Informe
  const [rep, setRep] = useState({ nieve: "", calidad: 0, nota: "" });

  if (ready && !user)
    return (
      <div className="empty glass-panel">
        <h1 className="page-title">Publica en Traza</h1>
        <p className="muted">Inicia sesión para subir clips, compartir rutas y contar cómo está la nieve.</p>
        <div className="empty-actions">
          <Link href="/acceso?next=/publicar" className="btn btn-primary">
            Iniciar sesión
          </Link>
          <Link href="/acceso?modo=registro&next=/publicar" className="btn btn-glass">
            Crear cuenta
          </Link>
        </div>
      </div>
    );

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      setBusy(true);
      if (tab === "media") {
        if (!files.length) throw new Error("Añade un clip o una foto.");
        const fd = new FormData();
        files.forEach((f) => fd.append("archivo", f));
        fd.append("texto", texto);
        fd.append("estacion", estacion);
        if (spotId) fd.append("spot", spotId);
        const r = await api("/api/posts", { method: "POST", body: fd });
        router.push(`/p/${r.id}`);
      } else if (tab === "spot") {
        if (!draft.length) throw new Error("Marca el spot o dibuja la ruta tocando el mapa.");
        const r = await api("/api/spots", { method: "POST", body: JSON.stringify({ ...sp, estacion, coords: draft }) });
        router.push(`/spots/${r.id}`);
      } else {
        if (!rep.nieve) throw new Error("Elige el tipo de nieve.");
        if (!rep.calidad) throw new Error("Puntúa la nieve del 1 al 5.");
        await api("/api/reports", { method: "POST", body: JSON.stringify({ ...rep, estacion }) });
        router.push(`/estaciones/${est?.slug ?? ""}`);
      }
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const stationSelect = (
    <label className="field">
      <span>Estación</span>
      <select value={estacion} onChange={(e) => setEstacion(e.target.value)} required={tab !== "media"}>
        <option value="">{tab === "media" ? "Sin estación" : "Elige la estación"}</option>
        {stations.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <form className="publish" onSubmit={submit} noValidate>
      <header className="publish-head">
        <h1 className="page-title">Publicar</h1>
        <div className="segmented" role="tablist" aria-label="Qué quieres publicar">
          {TABS.map(([k, label]) => (
            <button type="button" key={k} role="tab" aria-selected={tab === k} onClick={() => (setTab(k), setError(""))}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {tab === "media" && (
        <div className="publish-grid">
          <label className={`dropzone ${previews.length ? "has-files" : ""}`}>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setFiles([...e.target.files].slice(0, 4))}
            />
            {previews.length ? (
              <span className="drop-previews">
                {previews.map((p, i) =>
                  p.video ? <video key={i} src={p.url} muted loop autoPlay playsInline /> : <img key={i} src={p.url} alt="" />
                )}
              </span>
            ) : (
              <span className="drop-empty">
                <Icon name="upload" size={28} />
                <b>Sube tu clip o tus fotos</b>
                <span className="muted small">MP4, MOV o WebM hasta 80 MB · JPG, PNG o WebP hasta 12 MB</span>
              </span>
            )}
          </label>
          <div className="publish-fields">
            <label className="field">
              <span>Texto</span>
              <textarea rows={4} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Primeras huellas en Beret después de 40 cm" />
            </label>
            {stationSelect}
            <label className="field">
              <span>Spot (opcional)</span>
              <select value={spotId} onChange={(e) => setSpotId(e.target.value)}>
                <option value="">Ninguno</option>
                {spots
                  .filter((s) => !estacion || s.estacionSlug === est?.slug)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} · {s.estacion}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        </div>
      )}

      {tab === "spot" && (
        <div className="publish-grid">
          <div className="publish-map">
            <MapView className="map-inline map-pick" stations={stations} spots={[]} draft={draft} fit={fit} initialBase="topo" onMapClick={(c) => setDraft((d) => [...d, c])} />
            <div className="map-tools">
              <span className="small">{draft.length === 0 ? "Toca el mapa: 1 punto = spot, varios = ruta" : `${draft.length} ${draft.length === 1 ? "punto · spot" : "puntos · ruta"}`}</span>
              <button type="button" className="btn btn-glass btn-small" onClick={() => setDraft((d) => d.slice(0, -1))} disabled={!draft.length}>
                <Icon name="undo" size={16} /> Deshacer
              </button>
              <label className="btn btn-glass btn-small">
                <Icon name="upload" size={16} /> GPX
                <input
                  type="file"
                  accept=".gpx,application/gpx+xml"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files[0];
                    if (!f) return;
                    const pts = parseGPX(await f.text());
                    if (pts.length) setDraft(pts);
                    else setError("Ese archivo GPX no tiene puntos de traza.");
                  }}
                />
              </label>
            </div>
          </div>
          <div className="publish-fields">
            <label className="field">
              <span>Nombre</span>
              <input value={sp.nombre} maxLength={90} onChange={(e) => setSp({ ...sp, nombre: e.target.value })} placeholder="Corredor norte de Baciver" />
            </label>
            {stationSelect}
            <fieldset className="field">
              <legend>Dificultad</legend>
              <div className="chips-row">
                {Object.entries(DIFICULTAD).map(([k, v]) => (
                  <button type="button" key={k} className={`chip ${sp.dificultad === k ? "is-on" : ""}`} aria-pressed={sp.dificultad === k} onClick={() => setSp({ ...sp, dificultad: k })}>
                    <i className={`diff-dot d-${k}`} /> {v.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="field">
              <legend>Orientación</legend>
              <div className="chips-row">
                {ORIENTACIONES.map((o) => (
                  <button type="button" key={o} className={`chip chip-sq ${sp.orientacion === o ? "is-on" : ""}`} aria-pressed={sp.orientacion === o} onClick={() => setSp({ ...sp, orientacion: o })}>
                    {o}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="field">
              <span>Desnivel en metros (opcional)</span>
              <input inputMode="numeric" value={sp.desnivel} onChange={(e) => setSp({ ...sp, desnivel: e.target.value.replace(/\D/g, "") })} placeholder="600" />
            </label>
            <label className="field">
              <span>Descripción</span>
              <textarea rows={4} value={sp.descripcion} onChange={(e) => setSp({ ...sp, descripcion: e.target.value })} placeholder="Entrada estrecha desde la cresta y luego una pala ancha. Mejor dos días después de nevada." />
            </label>
            <p className="avalanche small">
              <Icon name="alert" size={18} /> Comparte solo líneas que conozcas y describe sus riesgos con honestidad.
            </p>
          </div>
        </div>
      )}

      {tab === "informe" && (
        <div className="publish-fields publish-narrow">
          {stationSelect}
          <fieldset className="field">
            <legend>Tipo de nieve</legend>
            <div className="chips-row">
              {Object.entries(NIEVE).map(([k, v]) => (
                <button type="button" key={k} className={`chip ${rep.nieve === k ? "is-on" : ""}`} aria-pressed={rep.nieve === k} onClick={() => setRep({ ...rep, nieve: k })}>
                  {v}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="field">
            <legend>Calidad</legend>
            <div className="rating" role="radiogroup" aria-label="Calidad de 1 a 5">
              {[1, 2, 3, 4, 5].map((k) => (
                <button type="button" key={k} role="radio" aria-checked={rep.calidad === k} className={k <= rep.calidad ? "on" : ""} onClick={() => setRep({ ...rep, calidad: k })}>
                  {k}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span>Nota (opcional)</span>
            <input value={rep.nota} maxLength={280} onChange={(e) => setRep({ ...rep, nota: e.target.value })} placeholder="Polvo en las caras norte hasta mediodía" />
          </label>
        </div>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="publish-submit">
        <button className="btn btn-primary btn-large" disabled={busy}>
          {busy ? "Publicando…" : tab === "media" ? "Publicar" : tab === "spot" ? "Compartir spot" : "Publicar informe"}
        </button>
      </div>
    </form>
  );
}
