"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import Icon from "../Icon";
import { useAuth, api } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

const TYPE_LABEL = { clip: "Clip", foto: "Foto", ruta: "Ruta", informe: "Informe de nieve" };

function Media({ m, alt }) {
  const ref = useRef(null);
  // Los clips se reproducen solos, sin sonido, solo mientras están en pantalla
  useEffect(() => {
    const v = ref.current;
    if (!v || m.tipo !== "video") return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.6 });
    io.observe(v);
    return () => io.disconnect();
  }, [m]);
  if (m.tipo === "video")
    return <video ref={ref} className="post-media" src={m.url} poster={m.poster || undefined} muted loop playsInline preload="metadata" aria-label={alt} />;
  return <img className="post-media" src={m.url} alt={alt} loading="lazy" />;
}

export default function PostCard({ post, compact = false }) {
  const { user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const [copied, setCopied] = useState(false);
  const media = post.medios?.[0];

  async function like() {
    if (!user) return router.push(`/acceso?next=${encodeURIComponent(location.pathname)}`);
    setLiked((l) => !l);
    setLikes((n) => n + (liked ? -1 : 1));
    try {
      const r = await api(`/api/posts/${post.id}/like`, { method: "POST" });
      setLiked(r.liked);
      setLikes(r.likes);
    } catch {
      setLiked(post.liked);
      setLikes(post.likes);
    }
  }

  async function share() {
    const url = `${location.origin}/p/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: "Traza", text: post.texto, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {}
  }

  return (
    <article className={`post ${compact ? "is-compact" : ""} post-${post.tipo}`}>
      <header className="post-head">
        <Avatar user={post} size={36} />
        <div className="post-who">
          <Link href={`/u/${post.username}`} className="post-name">
            {post.nombre}
          </Link>
          <span className="post-meta">
            {post.estacion && (
              <>
                <Link href={`/estaciones/${post.estacionSlug}`}>{post.estacion}</Link> ·{" "}
              </>
            )}
            <time dateTime={post.creadoEn}>{timeAgo(post.creadoEn)}</time>
          </span>
        </div>
        <span className="post-type">{TYPE_LABEL[post.tipo]}</span>
      </header>

      {media && (
        <Link href={`/p/${post.id}`} className="post-frame" aria-label="Abrir publicación">
          <Media m={media} alt={post.texto || TYPE_LABEL[post.tipo]} />
          {media.tipo === "video" && (
            <span className="post-badge">
              <Icon name="play" size={14} fill /> Clip
            </span>
          )}
        </Link>
      )}

      {post.tipo === "informe" && !media && (
        <Link href={`/estaciones/${post.estacionSlug}`} className="post-report">
          <Icon name="snow" size={22} />
          <span>{post.texto}</span>
        </Link>
      )}

      {post.tipo !== "informe" && post.texto && <p className="post-text">{post.texto}</p>}

      {post.spotId && (
        <Link href={`/spots/${post.spotId}`} className="post-spot">
          <Icon name="route" size={16} />
          {post.spot}
          <Icon name="arrow" size={14} />
        </Link>
      )}

      <footer className="post-actions">
        <button className={`act ${liked ? "is-on" : ""}`} onClick={like} aria-pressed={liked} aria-label={liked ? "Quitar me gusta" : "Me gusta"}>
          <Icon name="heart" fill={liked} />
          <span className="num">{likes}</span>
        </button>
        <Link href={`/p/${post.id}#comentarios`} className="act" aria-label="Comentarios">
          <Icon name="comment" />
          <span className="num">{post.comentarios}</span>
        </Link>
        <button className="act act-end" onClick={share} aria-label="Compartir">
          <Icon name="share" />
          {copied && <span className="act-tip">Enlace copiado</span>}
        </button>
      </footer>
    </article>
  );
}
