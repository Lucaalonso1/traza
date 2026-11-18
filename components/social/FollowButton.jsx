"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, api } from "@/lib/auth";

export default function FollowButton({ username, initial, small = false, onChange }) {
  const { user } = useAuth();
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  if (user?.username === username) return null;

  async function toggle() {
    if (!user) return router.push(`/acceso?next=/u/${username}`);
    setBusy(true);
    setOn((v) => !v);
    try {
      const r = await api("/api/follow", { method: "POST", body: JSON.stringify({ username }) });
      setOn(r.following);
      onChange?.(r);
    } catch {
      setOn(initial);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={`btn ${on ? "btn-glass" : "btn-primary"} ${small ? "btn-small btn-follow" : ""}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
    >
      {on ? "Siguiendo" : "Seguir"}
    </button>
  );
}
