"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, api } from "@/lib/auth";
import { NIEVE } from "@/lib/format";

export default function SnowReportForm({ estacionId }) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ nieve: "", calidad: 0, nota: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user)
    return (
      <p className="muted small">
        <Link href="/acceso">Inicia sesión</Link> para contar cómo está la nieve hoy.
      </p>
    );
  if (!open)
    return (
      <button className="btn btn-glass btn-small btn-block" onClick={() => setOpen(true)}>
        Contar cómo está hoy
      </button>
    );

  async function send(e) {
    e.preventDefault();
    if (!f.nieve) return setError("Elige el tipo de nieve.");
    if (!f.calidad) return setError("Puntúa la nieve del 1 al 5.");
    setBusy(true);
    setError("");
    try {
      await api("/api/reports", { method: "POST", body: JSON.stringify({ ...f, estacion: estacionId }) });
      setOpen(false);
      setF({ nieve: "", calidad: 0, nota: "" });
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="report-form" onSubmit={send}>
      <fieldset>
        <legend className="small">Tipo de nieve</legend>
        <div className="chips-row">
          {Object.entries(NIEVE).map(([k, v]) => (
            <button type="button" key={k} className={`chip ${f.nieve === k ? "is-on" : ""}`} aria-pressed={f.nieve === k} onClick={() => setF({ ...f, nieve: k })}>
              {v}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="small">Calidad</legend>
        <div className="rating" role="radiogroup" aria-label="Calidad de 1 a 5">
          {[1, 2, 3, 4, 5].map((k) => (
            <button type="button" key={k} role="radio" aria-checked={f.calidad === k} className={k <= f.calidad ? "on" : ""} onClick={() => setF({ ...f, calidad: k })}>
              {k}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>Nota (opcional)</span>
        <input value={f.nota} maxLength={280} onChange={(e) => setF({ ...f, nota: e.target.value })} placeholder="Polvo en las caras norte hasta mediodía" />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="row-actions">
        <button type="button" className="btn btn-glass btn-small" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button className="btn btn-primary btn-small" disabled={busy}>
          Publicar informe
        </button>
      </div>
    </form>
  );
}
