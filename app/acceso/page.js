"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useAuth } from "@/lib/auth";

function AccessForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next")?.startsWith("/") ? params.get("next") : "/explorar";
  const { login, register, user } = useAuth();
  const [mode, setMode] = useState(params.get("modo") === "registro" ? "register" : "login");
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const emailOk = mode === "login" ? form.email.trim().length > 2 : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const userOk = mode === "login" || /^[a-z0-9._]{3,30}$/.test(form.username.trim().toLowerCase());
  const passOk = form.password.length >= 8;
  const nameOk = mode === "login" || form.name.trim().length >= 2;

  async function onSubmit(e) {
    e.preventDefault();
    if (!emailOk) return setError(mode === "login" ? "Escribe tu correo o tu usuario." : "Escribe un correo válido, por ejemplo nombre@correo.com.");
    if (!passOk) return setError("La contraseña necesita al menos 8 caracteres.");
    if (!nameOk) return setError("Dinos cómo te llamas.");
    if (!userOk) return setError("El usuario debe tener entre 3 y 30 caracteres: letras, números, punto o guion bajo.");
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await login(form);
      else await register(form);
      router.push(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (user)
    return (
      <div className="auth-card">
        <h1 className="page-title">Hola, {user.name}</h1>
        <p className="muted">Ya has iniciado sesión.</p>
        <button className="btn btn-primary" onClick={() => router.push(next)}>
          Continuar
        </button>
      </div>
    );

  return (
    <motion.div className="auth-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <h1 className="page-title">{mode === "login" ? "Vuelve a la montaña" : "Únete a Traza"}</h1>

      <div className="segmented" role="tablist" aria-label="Tipo de acceso">
        <button role="tab" aria-selected={mode === "login"} onClick={() => (setMode("login"), setError(""))}>
          Iniciar sesión
        </button>
        <button role="tab" aria-selected={mode === "register"} onClick={() => (setMode("register"), setError(""))}>
          Crear cuenta
        </button>
      </div>

      <form onSubmit={onSubmit} noValidate className="auth-form">
        {mode === "register" && (
          <label className="field">
            <span>Nombre</span>
            <input autoComplete="given-name" value={form.name} onChange={set("name")} placeholder="Marta Gil" />
          </label>
        )}
        {mode === "register" && (
          <label className="field">
            <span>Usuario</span>
            <input autoComplete="username" autoCapitalize="none" spellCheck="false" value={form.username} onChange={set("username")} placeholder="marta.freeride" />
          </label>
        )}
        <label className="field">
          <span>{mode === "login" ? "Correo o usuario" : "Correo"}</span>
          <input
            type={mode === "login" ? "text" : "email"}
            autoComplete={mode === "login" ? "username" : "email"}
            autoCapitalize="none"
            inputMode="email"
            value={form.email}
            onChange={set("email")}
            placeholder="nombre@correo.com"
          />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={form.password}
            onChange={set("password")}
            placeholder="Mínimo 8 caracteres"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Un momento…" : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </button>
      </form>
      <p className="muted small">
        Tu contraseña se guarda cifrada. Puedes cambiar de dispositivo y tu perfil, tus publicaciones y tu garaje te seguirán.
      </p>
    </motion.div>
  );
}

export default function Page() {
  return (
    <div className="page page-auth">
      <Suspense>
        <AccessForm />
      </Suspense>
    </div>
  );
}
