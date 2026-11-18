import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/server/auth";
import { spot, postsBy } from "@/lib/server/queries";
import StationMap from "@/components/map/StationMap";
import SaveSpotButton from "@/components/social/SaveSpotButton";
import PostCard from "@/components/social/PostCard";
import Avatar from "@/components/social/Avatar";
import Icon from "@/components/Icon";
import { DIFICULTAD, n, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const s = await spot(Number((await params).id));
  return { title: s ? `${s.nombre} · ${s.estacion} — Traza` : "Spot — Traza" };
}

export default async function Page({ params }) {
  const u = await currentUser();
  const s = await spot(Number((await params).id), u?.id ?? 0);
  if (!s) notFound();
  const posts = await postsBy({ viewer: u?.id ?? 0, spotId: s.id });
  const d = DIFICULTAD[s.dificultad];

  return (
    <div className="page page-wide">
      <div className="spot-layout">
        <div>
          <StationMap station={{ nombre: s.estacion, lng: s.geom.type === "Point" ? s.geom.coordinates[0] : s.geom.coordinates[0][0], lat: s.geom.type === "Point" ? s.geom.coordinates[1] : s.geom.coordinates[0][1] }} spots={[s]} hideStation />
        </div>
        <section className="spot-info">
          <p className="muted small">
            <Link href={`/estaciones/${s.estacionSlug}`}>{s.estacion}</Link> · {s.tipo === "ruta" ? "Ruta" : "Spot"}
          </p>
          <h1 className="page-title">{s.nombre}</h1>
          <dl className="spot-facts">
            <div>
              <dt>Dificultad</dt>
              <dd>
                <i className={`diff-dot d-${s.dificultad}`} /> {d.label}
              </dd>
            </div>
            <div>
              <dt>Orientación</dt>
              <dd className="num">{s.orientacion}</dd>
            </div>
            <div>
              <dt>Desnivel</dt>
              <dd className="num">{s.desnivel ? `${n(s.desnivel)} m` : "—"}</dd>
            </div>
            {s.tipo === "ruta" && (
              <div>
                <dt>Puntos</dt>
                <dd className="num">{s.geom.coordinates.length}</dd>
              </div>
            )}
          </dl>
          <p className="spot-desc">{s.descripcion}</p>
          <div className="spot-author">
            <Avatar user={{ username: s.username, nombre: s.autor, color: s.color, avatar: s.avatar }} size={32} />
            <span className="small">
              Compartido por <Link href={`/u/${s.username}`}>{s.autor}</Link> · {timeAgo(s.creadoEn)}
            </span>
          </div>
          <div className="row-actions">
            <SaveSpotButton id={s.id} initial={s.saved} count={s.guardados} />
            <Link href={`/publicar?estacion=${s.estacionSlug}&spot=${s.id}`} className="btn btn-glass">
              Subir un clip aquí
            </Link>
          </div>
          <a className="avalanche" href={s.boletin} target="_blank" rel="noreferrer">
            <Icon name="alert" size={22} />
            <span>
              <b>Terreno no controlado</b>
              <span className="small">
                Fuera de pista no hay control de aludes. Consulta el boletín oficial, lleva ARVA, pala y sonda y no vayas solo.
              </span>
            </span>
          </a>
          {s.cercanos.length > 0 && (
            <div>
              <h2 className="block-title">Cerca de aquí</h2>
              <ul className="spot-cards">
                {s.cercanos.map((c) => (
                  <li key={c.id}>
                    <Link href={`/spots/${c.id}`} className="spot-card">
                      <i className={`diff-dot d-${c.dificultad}`} />
                      <span>
                        <b>{c.nombre}</b>
                        <span className="muted small num">a {String(c.km).replace(".", ",")} km</span>
                      </span>
                      <Icon name="arrow" size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
      {posts.length > 0 && (
        <section aria-labelledby="sp-posts">
          <h2 id="sp-posts" className="block-title">
            En este spot
          </h2>
          <div className="post-grid">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
