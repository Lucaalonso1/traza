import Link from "next/link";
import { stations } from "@/lib/server/queries";
import { NIEVE, n } from "@/lib/format";

export const metadata = { title: "Estaciones — Traza" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const list = await stations();
  return (
    <div className="page page-wide">
      <header className="page-head">
        <h1 className="page-title">Estaciones</h1>
        <p className="muted head-note">Spots, rutas, clips y el estado de la nieve contado por quien ha esquiado hoy.</p>
      </header>
      <ul className="station-grid">
        {list.map((s) => (
          <li key={s.slug}>
            <Link href={`/estaciones/${s.slug}`} className="station-card">
              <div className="station-top">
                <h2>{s.nombre}</h2>
                <span className="muted small">
                  {s.region} · {s.pais}
                </span>
              </div>
              <div className="station-alt" aria-label={`Cota de ${s.cotaMin} a ${s.cotaMax} metros`}>
                <span className="num">{n(s.cotaMin)}</span>
                <span className="alt-bar" style={{ "--a": (s.cotaMin - 1000) / 2900, "--b": (s.cotaMax - 1000) / 2900 }} />
                <span className="num">{n(s.cotaMax)} m</span>
              </div>
              <dl className="station-stats">
                <div>
                  <dt>Nieve</dt>
                  <dd>{s.nieve ? NIEVE[s.nieve] : "Sin informes"}</dd>
                </div>
                <div>
                  <dt>Spots</dt>
                  <dd className="num">{s.spots}</dd>
                </div>
                <div>
                  <dt>Pistas</dt>
                  <dd className="num">{s.km} km</dd>
                </div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
