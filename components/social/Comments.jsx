"use client";
import Link from "next/link";
import { useState } from "react";
import Avatar from "./Avatar";
import { useAuth, api } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

export default function Comments({ postId, initial }) {
  const { user } = useAuth();
  const [list, setList] = useState(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return setError("Escribe un comentario antes de enviarlo.");
    setBusy(true);
    setError("");
    try {
      const r = await api(`/api/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ texto: text }) });
      setList((l) => [...l, r.comment]);
      setText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="comments" id="comentarios" aria-labelledby="c-title">
      <h2 id="c-title" className="side-title">
        {list.length ? `${list.length} ${list.length === 1 ? "comentario" : "comentarios"}` : "Comentarios"}
      </h2>
      <ul className="comment-list">
        {list.map((c) => (
          <li key={c.id}>
            <Avatar user={c} size={32} />
            <div>
              <p className="comment-head">
                <Link href={`/u/${c.username}`}>{c.nombre}</Link>
                <time>{timeAgo(c.creadoEn)}</time>
              </p>
              <p className="comment-text">{c.texto}</p>
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="muted small">Sé el primero en comentar.</li>}
      </ul>
      {user ? (
        <form className="comment-form" onSubmit={send}>
          <label className="sr-only" htmlFor="c-input">
            Escribe un comentario
          </label>
          <input
            id="c-input"
            value={text}
            maxLength={500}
            onChange={(e) => {
              setText(e.target.value);
              setError("");
            }}
            placeholder="¿Cómo estaba la nieve?"
          />
          <button className="btn btn-primary btn-small" disabled={busy}>
            Enviar
          </button>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>
      ) : (
        <p className="muted small">
          <Link href={`/acceso?next=/p/${postId}`}>Inicia sesión</Link> para comentar.
        </p>
      )}
    </section>
  );
}
