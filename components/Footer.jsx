import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <Logo className="footer-mark" />
          <p className="muted">La comunidad de quienes esquían la montaña entera: spots, rutas y clips de cada estación.</p>
        </div>
        <nav className="footer-links" aria-label="Pie de página">
          <Link href="/explorar">Explorar</Link>
          <Link href="/mapa">Mapa</Link>
          <Link href="/estaciones">Estaciones</Link>
          <Link href="/recomendador">Elige tu esquí</Link>
        </nav>
      </div>
      <p className="footer-note muted">
        El esquí fuera de pista tiene riesgos: consulta siempre el boletín oficial de aludes. Las recomendaciones de esquís se generan con IA y son orientativas.
      </p>
    </footer>
  );
}
