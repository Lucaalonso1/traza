"use client";
// Adaptación del «tubelight navbar» al sistema de Traza: el enlace activo
// lleva una lámpara naranja que se desliza de un enlace a otro (layoutId
// compartido de motion) y deja un halo encima.
import Link from "next/link";
import { motion } from "motion/react";
import Icon from "../Icon";

const spring = { type: "spring", stiffness: 300, damping: 30 };

function Lamp({ id, position = "top" }) {
  return (
    <motion.span layoutId={id} className={`lamp lamp-${position}`} initial={false} transition={spring} aria-hidden="true">
      <span className="lamp-bar">
        <i className="lamp-glow g1" />
        <i className="lamp-glow g2" />
        <i className="lamp-glow g3" />
      </span>
    </motion.span>
  );
}

/** Enlaces de la barra superior. `items`: [{ name, url, icon }] */
export function NavBar({ items, isActive, className = "" }) {
  return (
    <div className={`tube ${className}`}>
      {items.map((item) => {
        const on = isActive(item.url);
        return (
          <Link key={item.url} href={item.url} className="tube-link" aria-current={on ? "page" : undefined}>
            <span className="tube-text">{item.name}</span>
            {on && <Lamp id="lamp" />}
          </Link>
        );
      })}
    </div>
  );
}

/** Barra inferior en móvil, con la misma lámpara. */
export function TabBar({ items, isActive }) {
  return (
    <nav className="tabbar" aria-label="Secciones">
      {items.map((item) => {
        const on = isActive(item.url);
        return (
          <Link key={item.name} href={item.url} className={`tab ${item.main ? "tab-main" : ""}`} aria-current={on ? "page" : undefined}>
            {on && <Lamp id="lamp-tab" />}
            <Icon name={item.icon} size={22} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
