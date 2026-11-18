import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/server/auth";
import { profile, postsBy, spots as allSpots, twins } from "@/lib/server/queries";
import { q } from "@/lib/server/db";
import Avatar from "@/components/social/Avatar";
import FollowButton from "@/components/social/FollowButton";
import PostCard from "@/components/social/PostCard";
import Icon from "@/components/Icon";
import { STYLES, LEVELS } from "@/lib/catalog";
import { DIFICULTAD, n } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const p = await profile((await params).username);
  return { title: p ? `${p.nombre} (@${p.username}) — Traza` : "Perfil — Traza" };
}

export default async function Page({ params }) {
  const me = await currentUser();
  const p = await profile((await params).username, me?.id ?? 0);
  if (!p) notFound();
  const own = me?.id === p.id;
  const [posts, spotsAll, saved, gemelos] = await Promise.all([
    postsBy({ viewer: me?.id ?? 0, autorId: p.id }),
    allSpots({ viewer: me?.id ?? 0 }),
    own
      ? q(`SELECT s.id, s.nombre, s.dificultad, e.nombre AS estacion FROM guardados g JOIN spots s ON s.id = g.spot_id JOIN estaciones e ON e.id = s.estacion_id WHERE g.usuario_id = :u ORDER BY g.creado_en DESC`, { u: p.id })
      : Promise.resolve([]),
    own ? twins(p.id) : Promise.resolve([]),
  ]);
  const mySpots = spotsAll.filter((s) => s.username === p.username);

  return (
    <div className="page page-wide">
      <header className="profile-head">
        <Avatar user={p} size={92} link={false} />
        <div className="profile-main">
          <h1 className="page-title">{p.nombre}</h1>
          <p className="muted">
            @{p.username}
            {p.casa && (
              <>
                {" "}· esquía en <Link href={`/estaciones/${p.casaSlug}`}>{p.casa}</Link>
              </>
            )}
          </p>
          {p.bio && <p className="profile-bio">{p.bio}</p>}
          <div className="profile-tags">
            {p.estilo && <span className="tag">{STYLES[p.estilo]?.label}</span>}
            {p.nivel != null && <span className="tag">{LEVELS[p.nivel]?.label}</span>}
          </div>
        </div>
        <div className="profile-cta">
          {own ? (
            <Link href="/ajustes" className="btn btn-glass">
              <Icon name="settings" size={18} /> Editar perfil
            </Link>
          ) : (
            <FollowButton username={p.username} initial={p.sigo} />
          )}
        </div>
      </header>

      <dl className="profile-stats">
        <div>
          <dt>Publicaciones</dt>
          <dd className="num">{n(p.publicaciones)}</dd>
        </div>
        <div>
          <dt>Spots</dt>
          <dd className="num">{n(p.spots)}</dd>
        </div>
        <div>
          <dt>Estaciones</dt>
          <dd className="num">{n(p.estaciones)}</dd>
        </div>
        <div>
          <dt>Seguidores</dt>
          <dd className="num">{n(p.seguidores)}</dd>
        </div>
        <div>
          <dt>Siguiendo</dt>
          <dd className="num">{n(p.siguiendo)}</dd>
        </div>
      </dl>

      <div className="profile-layout">
        <section aria-labelledby="pf-posts">
          <h2 id="pf-posts" className="block-title">
            Publicaciones
          </h2>
          {posts.length ? (
            <div className="post-grid">
              {posts.map((x) => (
                <PostCard key={x.id} post={x} compact />
              ))}
            </div>
          ) : (
            <div className="empty glass-panel">
              <p className="muted">{own ? "Aún no has publicado nada." : "Todavía no ha publicado nada."}</p>
              {own && (
                <Link href="/publicar" className="btn btn-primary">
                  Publicar tu primer clip
                </Link>
              )}
            </div>
          )}
        </section>

        <aside className="profile-side">
          {mySpots.length > 0 && (
            <div className="side-card">
              <h2 className="side-title">Sus spots</h2>
              <ul className="spot-cards tight">
                {mySpots.map((s) => (
                  <li key={s.id}>
                    <Link href={`/spots/${s.id}`} className="spot-card">
                      <i className={`diff-dot d-${s.dificultad}`} />
                      <span>
                        <b>{s.nombre}</b>
                        <span className="muted small">{s.estacion}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {own && (
            <div className="side-card">
              <h2 className="side-title">Spots guardados</h2>
              {saved.length ? (
                <ul className="spot-cards tight">
                  {saved.map((s) => (
                    <li key={s.id}>
                      <Link href={`/spots/${s.id}`} className="spot-card">
                        <i className={`diff-dot d-${s.dificultad}`} />
                        <span>
                          <b>{s.nombre}</b>
                          <span className="muted small">
                            {s.estacion} · {DIFICULTAD[s.dificultad].label}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">Guarda spots desde el mapa para tenerlos a mano.</p>
              )}
            </div>
          )}
          {own && (
            <div className="side-card">
              <h2 className="side-title">Tus gemelos de nieve</h2>
              {gemelos.length ? (
                <>
                  <p className="muted small">Esquiadores con tu físico, tu nivel y tu estilo.</p>
                  <ul className="who-list">
                    {gemelos.map((g) => (
                      <li key={g.username}>
                        <Avatar user={g} size={34} />
                        <Link href={`/u/${g.username}`} className="who-name">
                          <b>{g.nombre}</b>
                          <span>{STYLES[g.estilo]?.label ?? `@${g.username}`}</span>
                        </Link>
                        <FollowButton username={g.username} initial={false} small />
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="muted small">
                  <Link href="/ajustes">Añade tu altura, peso y nivel</Link> para encontrar esquiadores como tú.
                </p>
              )}
            </div>
          )}
          {own && (
            <Link href="/garaje" className="side-card side-ski">
              <span className="side-title">Tu garaje</span>
              <span className="muted small">Los esquís que has guardado del recomendador.</span>
              <span className="side-go">
                Abrir <span aria-hidden="true">→</span>
              </span>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
