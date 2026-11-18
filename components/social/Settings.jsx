"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, api } from "@/lib/auth";
import { LEVELS, STYLES } from "@/lib/catalog";
import Avatar from "./Avatar";
import Icon from "../Icon";

function PhotoField({ user, onChange }) {
  const input = useRef(null);
  const [avatar, setAvatar] = useState(user.avatar ?? null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file) {
    if (!file) return;
    setError("");
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("foto", file);
      const r = await api("/api/me/avatar", { method: "POST", body: fd });
      setAvatar(r.avatar);
      await onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setPreview(null);
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api("/api/me/avatar", { method: "DELETE" });
      setAvatar(null);
      await onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const shown = { ...user, avatar: preview || avatar };
  return (
    <div className="photo-field">
      <button type="button" className={`photo-ring ${busy ? "is-busy" : ""}`} onClick={() => input.current?.click()} aria-label="Cambiar foto de perfil">
        <Avatar user={shown} size={96} link={false} />
        <span className="photo-cam" aria-hidden="true">
          <Icon name="upload" size={16} />
        </span>
      </button>
      <div className="photo-copy">
        <p className="photo-title">Foto de perfil</p>
        <p className="muted small">JPG, PNG o HEIC. La recortamos en cuadrado.</p>
        <div className="photo-actions">
          <button type="button" className="btn btn-glass btn-small" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? "Subiendo…" : avatar ? "Cambiar foto" : "Subir foto"}
          </button>
          {avatar && !busy && (
            <button type="button" className="btn btn-ghost btn-small" onClick={remove}>
              Quitar
            </button>
          )}
        </div>
        {error && (
          <p className="form-error small" role="alert">
            {error}
          </p>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onChange={(e) => upload(e.target.files?.[0])} />
    </div>
  );
}

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
      <PhotoField
        user={user}
        onChange={async () => {
          await refresh();
          router.refresh();
        }}
      />
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
