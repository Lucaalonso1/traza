import Link from "next/link";

export default function Avatar({ user, size = 36, link = true }) {
  const initial = (user?.nombre || user?.username || "?").trim()[0]?.toUpperCase();
  const el = user?.avatar ? (
    <img className="avatar-img" src={user.avatar} alt="" width={size} height={size} style={{ width: size, height: size }} loading="lazy" />
  ) : (
    <span
      className="avatar-dot"
      style={{ width: size, height: size, fontSize: size * 0.42, "--c": user?.color || "#f2774a" }}
      aria-hidden={link ? "true" : undefined}
    >
      {initial}
    </span>
  );
  if (!link || !user?.username) return el;
  return (
    <Link href={`/u/${user.username}`} className="avatar-link" aria-label={`Perfil de ${user.nombre || user.username}`}>
      {el}
    </Link>
  );
}
