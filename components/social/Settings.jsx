"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, api } from "@/lib/auth";
import { LEVELS, STYLES } from "@/lib/catalog";

export default function Settings({ user, stations }) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [f, setF] = useState({
    nombre: user.nombre ?? "",
    bio: user.bio ?? "",
    altura: user.altura_cm ?? "",
    peso: user.peso_kg ?? "",
    nivel: user.nivel ?? "",
    estilo: user.estilo ?? "",
    casa: user.estacion_casa ?? "",
  });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      await api("/api/me", { method: "PATCH", body: JSON.stringify(f) });
      await refresh();
      setMsg("Cambios guardados");
      router.refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="auth-card settings" onSubmit={save} noValidate>
      <h1 className="page-title">Tu perfil</h1>
      <label className="field">
        <span>Nombre</span>
        <input value={f.nombre} onChange={set("nombre")} autoComplete="name" />
      </label>
      <label className="field">
        <span>Bio</span>
        <textarea rows={3} maxLength={280} value={f.bio} onChange={set("bio")} placeholder="Dónde esquías y qué te gusta" />
      </label>
      <label className="field">
        <span>Estación de casa</span>
        <select value={f.casa} onChange={set("casa")}>
          <option value="">Ninguna</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </label>
      <p className="muted small settings-note">
        Tu físico es privado. Solo se usa para recomendarte esquís y encontrar esquiadores parecidos a ti.
      </p>
      <div className="settings-row">
        <label className="field">
          <span>Altura (cm)</span>
          <input inputMode="numeric" value={f.altura} onChange={set("altura")} placeholder="175" />
        </label>
        <label className="field">
          <span>Peso (kg)</span>
          <input inputMode="numeric" value={f.peso} onChange={set("peso")} placeholder="72" />
        </label>
      </div>
      <div className="settings-row">
        <label className="field">
          <span>Nivel</span>
          <select value={f.nivel} onChange={set("nivel")}>
            <option value="">Sin indicar</option>
            {LEVELS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Estilo</span>
          <select value={f.estilo} onChange={set("estilo")}>
            <option value="">Sin indicar</option>
            {Object.entries(STYLES).map(([k, s]) => (
              <option key={k} value={k}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {msg && (
        <p className="ok-msg" role="status">
          {msg}
        </p>
      )}
      <button className="btn btn-primary btn-block">Guardar cambios</button>
    </form>
  );
}
