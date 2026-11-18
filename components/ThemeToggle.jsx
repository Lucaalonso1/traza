"use client";
import { useEffect, useState } from "react";

// Botón de modo claro / oscuro: el sol y la luna se transforman entre sí.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || "dark");
    // Si nunca has elegido, sigue al sistema
    const mq = matchMedia("(prefers-color-scheme: light)");
    const onChange = (e) => {
      try {
        if (localStorage.getItem("traza.theme")) return;
      } catch {}
      const t = e.matches ? "light" : "dark";
      document.documentElement.dataset.theme = t;
      setTheme(t);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    const root = document.documentElement;
    // Transición suave de colores solo durante el cambio
    root.classList.add("theme-switching");
    root.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem("traza.theme", next);
    } catch {}
    window.setTimeout(() => root.classList.remove("theme-switching"), 320);
  }

  const light = theme === "light";
  return (
    <button
      type="button"
      className={`theme-toggle ${light ? "is-light" : ""}`}
      onClick={toggle}
      aria-label={light ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      title={light ? "Modo oscuro" : "Modo claro"}
      suppressHydrationWarning
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <mask id="tt-moon">
          <rect width="24" height="24" fill="#fff" />
          <circle className="tt-bite" cx="17" cy="7" r="6" fill="#000" />
        </mask>
        <circle className="tt-core" cx="12" cy="12" r="5" fill="currentColor" mask="url(#tt-moon)" />
        <g className="tt-rays" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </g>
      </svg>
    </button>
  );
}
