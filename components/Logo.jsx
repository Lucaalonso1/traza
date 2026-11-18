import { useId } from "react";

// Símbolo de Traza: la silueta de la montaña como sombra y una sola línea que
// sube la cresta y, al llegar a la cima, baja por la cara en S. Subida y
// descenso en un único trazo, de blanco nieve a alpenglow.
export function LogoMark({ size = 28, title, className = "" }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className={`logo-mark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={`tz-${id}`} x1="4" y1="50" x2="46" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" />
          <stop offset="0.74" stopColor="currentColor" />
          <stop offset="1" stopColor="#F2774A" />
        </linearGradient>
      </defs>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M4 50 L17 35 L24 41 L38 14 C 31 25, 48 29, 40 38 S 30 47, 47 54"
          stroke={`url(#tz-${id})`}
          strokeWidth="3.6"
        />
      </g>
    </svg>
  );
}

export default function Logo({ size = 26, className = "" }) {
  return (
    <span className={`logo ${className}`}>
      <LogoMark size={size} />
      <span className="logo-word">traza</span>
    </span>
  );
}
