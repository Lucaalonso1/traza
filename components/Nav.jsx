"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import Icon from "./Icon";
import Avatar from "./social/Avatar";
import { NavBar, TabBar } from "./ui/tubelight-navbar";

const LINKS = [
  { name: "Explorar", url: "/explorar", icon: "compass" },
  { name: "Mapa", url: "/mapa", icon: "map" },
  { name: "Estaciones", url: "/estaciones", icon: "mountain" },
  { name: "Elige tu esquí", url: "/recomendador", icon: "ski" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, garage } = useAuth();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  const active = (href) => pathname === href || pathname.startsWith(href + "/");

  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    if (!menu) return;
    const close = (e) => !menuRef.current?.contains(e.target) && setMenu(false);
    const esc = (e) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  return (
    <>
      <header className={`nav ${pathname === "/mapa" ? "on-map" : ""}`}>
        <nav className="nav-pill" aria-label="Principal">
          <Link href="/" className="brand" aria-label="Traza, inicio">
            <Logo size={28} />
          </Link>
          <NavBar items={LINKS} isActive={active} className="nav-links" />
          <div className="nav-end">
            <ThemeToggle />
            {user && (
              <Link href="/publicar" className="btn btn-primary btn-small nav-publish" aria-label="Publicar">
                <Icon name="plus" size={16} />
                <span className="label-long">Publicar</span>
              </Link>
            )}
            {user ? (
              <div className="nav-account" ref={menuRef}>
                <button className="avatar-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu" aria-label="Tu cuenta">
                  <Avatar user={user} size={36} link={false} />
                </button>
                {menu && (
                  <div className="account-menu" role="menu">
                    <p className="account-name">{user.nombre}</p>
                    <p className="account-mail">@{user.username}</p>
                    <Link role="menuitem" href={`/u/${user.username}`}>
                      Tu perfil
                    </Link>
                    <Link role="menuitem" href="/garaje">
                      Garaje {garage.length > 0 && <span className="badge">{garage.length}</span>}
                    </Link>
                    <Link role="menuitem" href="/ajustes">
                      Ajustes
                    </Link>
                    <button
                      role="menuitem"
                      onClick={async () => {
                        await logout();
                        router.push("/");
                        router.refresh();
                      }}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/acceso" className="btn btn-small">
                Entrar
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* Barra inferior en móvil */}
      <TabBar
        isActive={active}
        items={[
          { name: "Explorar", url: "/explorar", icon: "compass" },
          { name: "Mapa", url: "/mapa", icon: "map" },
          { name: "Publicar", url: "/publicar", icon: "plus", main: true },
          { name: "Estaciones", url: "/estaciones", icon: "mountain" },
          { name: user ? "Perfil" : "Entrar", url: user ? `/u/${user.username}` : "/acceso", icon: "user" },
        ]}
      />
    </>
  );
}
