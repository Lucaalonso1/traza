import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/server/auth";
import { station, spots, snowReports, postsBy } from "@/lib/server/queries";
import StationMap from "@/components/map/StationMap";
import SnowReportForm from "@/components/social/SnowReportForm";
import PostCard from "@/components/social/PostCard";
import Avatar from "@/components/social/Avatar";
import Icon from "@/components/Icon";
import { DIFICULTAD, NIEVE, n, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const s = await station((await params).slug);
  return { title: s ? `${s.nombre} — Traza` : "Estación — Traza" };
}

export default async function Page({ params }) {
  const s = await station((await params).slug);
  if (!s) notFound();
  const u = await currentUser();
  const [sps, reports, posts] = await Promise.all([
    spots({ viewer: u?.id ?? 0, estacionId: s.id }),
    snowReports(s.id),
    postsBy({ viewer: u?.id ?? 0, estacionId: s.id }),
  ]);
  const today = reports.filter((r) => r.fecha === new Date().toISOString().slice(0, 10));
  const avg = today.length ? (today.reduce((a, r) => a + r.calidad, 0) / today.length).toFixed(1) : null;

  return (
    <div className="page page-wide">
      <header className="station-hero">
        <div>
          <p className="muted small">
            {s.region} · {s.pais}
          </p>
          <h1 className="page-title">{s.nombre}</h1>
          <p className="station-desc">{s.descripcion}</p>
        </div>
        <dl className="station-facts">
          <div>
            <dt>Cota</dt>
            <dd className="num">
              {n(s.cotaMin)}–{n(s.cotaMax)} m
            </dd>
          </div>
          <div>
            <dt>Pistas</dt>
            <dd className="num">{s.km} km</dd>
          </div>
          <div>
            <dt>Nieve hoy</dt>
            <dd>{today[0] ? `${NIEVE[today[0].nieve]} · ${avg}/5` : "Sin informes"}</dd>
          </div>
        </dl>
      </header>

      <div className="station-layout">
        <div className="station-main">
          <StationMap station={s} spots={sps} />

          <section aria-labelledby="sp-title">
            <h2 id="sp-title" className="block-title">
              Spots y rutas
            </h2>
            {sps.length ? (
              <ul className="spot-cards">
                {sps.map((p) => (
                  <li key={p.id}>
                    <Link href={`/spots/${p.id}`} className="spot-card">
                      <i className={`diff-dot d-${p.dificultad}`} />
                      <span>
                        <b>{p.nombre}</b>
                        <span className="muted small">
                          {DIFICULTAD[p.dificultad].label} · {p.orientacion}
                          {p.desnivel ? ` · ${n(p.desnivel)} m` : ""} · por @{p.username}
                        </span>
                      </span>
                      <Icon name="arrow" size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nadie ha compartido todavía un spot aquí.</p>
            )}
            <Link href={`/publicar?tipo=spot&estacion=${s.id}`} className="btn btn-glass btn-small">
              <Icon name="plus" size={16} /> Añadir spot
            </Link>
          </section>

          <section aria-labelledby="pp-title">
            <h2 id="pp-title" className="block-title">
              Clips y fotos
            </h2>
            {posts.length ? (
              <div className="post-grid">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} compact />
                ))}
              </div>
            ) : (
              <p className="muted">Aún no hay publicaciones de esta estación.</p>
            )}
          </section>
        </div>

        <aside className="station-side">
          <div className="side-card">
            <h2 className="side-title">Informes de nieve</h2>
            <ul className="report-list">
              {reports.map((r) => (
                <li key={r.id}>
                  <Avatar user={r} size={30} />
                  <div>
                    <p className="report-head">
                      <b>{NIEVE[r.nieve]}</b>
                      <span className="report-q" aria-label={`Calidad ${r.calidad} de 5`}>
                        {[1, 2, 3, 4, 5].map((k) => (
                          <i key={k} className={k <= r.calidad ? "on" : ""} />
                        ))}
                      </span>
                    </p>
                    {r.nota && <p className="small">{r.nota}</p>}
                    <p className="muted small">
                      @{r.username} · {r.fecha === new Date().toISOString().slice(0, 10) ? "hoy" : timeAgo(r.fecha)}
                    </p>
                  </div>
                </li>
              ))}
              {reports.length === 0 && <li className="muted small">Sin informes en los últimos días.</li>}
            </ul>
            <SnowReportForm estacionId={s.id} />
          </div>
          <a className="side-card avalanche" href={s.boletin} target="_blank" rel="noreferrer">
            <Icon name="alert" size={22} />
            <span>
              <b>Antes de salir de pista</b>
              <span className="small">Consulta el boletín oficial de peligro de aludes de la zona.</span>
            </span>
          </a>
        </aside>
      </div>
    </div>
  );
}
