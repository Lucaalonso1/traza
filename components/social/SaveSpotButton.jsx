"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "../Icon";
import { useAuth, api } from "@/lib/auth";

export default function SaveSpotButton({ id, initial, count }) {
  const { user } = useAuth();
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [total, setTotal] = useState(count);

  async function toggle() {
    if (!user) return router.push(`/acceso?next=/spots/${id}`);
    setOn(!on);
    setTotal((t) => t + (on ? -1 : 1));
    try {
      const r = await api(`/api/spots/${id}/save`, { method: "POST" });
      setOn(r.saved);
    } catch {
      setOn(initial);
      setTotal(count);
    }
  }

  return (
    <button className={`btn ${on ? "btn-glass" : "btn-primary"}`} onClick={toggle} aria-pressed={on}>
      <Icon name="bookmark" size={18} fill={on} />
      {on ? "Guardado" : "Guardar"}
      <span className="num muted">{total}</span>
    </button>
  );
}
