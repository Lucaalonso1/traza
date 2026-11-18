"use client";
import Link from "next/link";
import { useState } from "react";
import PostCard from "./PostCard";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import { useAuth, api } from "@/lib/auth";
import { NIEVE } from "@/lib/format";

export default function Feed({ initial, suggestions, stations }) {
  const { user } = useAuth();
  const [scope, setScope] = useState("todo");
  const [posts, setPosts] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function load(s) {
    setScope(s);
    setLoading(true);
    try {
      const d = await api(`/api/feed?scope=${s}`);
      setPosts(d.posts);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="feed-layout">
      <section className="feed" aria-labelledby="feed-title">
        <div className="feed-top">
          <h1 id="feed-title" className="page-title">Explorar</h1>
          <div className="segmented" role="tablist" aria-label="Qué mostrar">
            <button role="tab" aria-selected={scope === "todo"} onClick={() => load("todo")}>
              Todo
            </button>
            <button
              role="tab"
              aria-selected={scope === "siguiendo"}
              onClick={() => (user ? load("siguiendo") : (location.href = "/acceso?next=/explorar"))}
            >
              Siguiendo
            </button>
          </div>
        </div>
        <div className={`feed-list ${loading ? "is-loading" : ""}`} aria-busy={loading}>
          {posts.length === 0 ? (
            <div className="empty glass-panel">
              <h2 className="step-title">Aún no hay nada aquí</h2>
              <p className="muted">Sigue a otros esquiadores o publica tu primer clip.</p>
              <Link href="/publicar" className="btn btn-primary">
                Publicar
              </Link>
            </div>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </div>
      </section>

      <aside className="feed-side">
        <div className="side-card">
          <h2 className="side-title">Nieve hoy</h2>
          <ul className="snow-list">
            {stations
              .filter((s) => s.nieve)
              .slice(0, 6)
              .map((s) => (
                <li key={s.slug}>
                  <Link href={`/estaciones/${s.slug}`}>
                    <span>{s.nombre}</span>
                    <span className="snow-tag">
                      {NIEVE[s.nieve]}
                      {s.calidad && <b className="num">{s.calidad}</b>}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
        {suggestions.length > 0 && (
          <div className="side-card">
            <h2 className="side-title">{user ? "Esquiadores para seguir" : "Esquiadores destacados"}</h2>
            <ul className="who-list">
              {suggestions.map((s) => (
                <li key={s.username}>
                  <Avatar user={s} size={38} />
                  <Link href={`/u/${s.username}`} className="who-name">
                    <b>{s.nombre}</b>
                    <span>@{s.username}</span>
                  </Link>
                  <FollowButton username={s.username} initial={false} small />
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link href="/recomendador" className="side-card side-ski">
          <span className="side-title">Elige tu esquí</span>
          <span className="muted small">La IA cruza tu físico con la opinión de esquiadores como tú.</span>
          <span className="side-go">
            Empezar <span aria-hidden="true">→</span>
          </span>
        </Link>
      </aside>
    </div>
  );
}
