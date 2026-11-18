"use client";
// Sesión y garaje del usuario, servidos desde MySQL a través de /api.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
const skiKey = (s) => `${s.marca}-${s.modelo}`.toLowerCase().replace(/\s+/g, "-").slice(0, 120);

async function api(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: opts.body && !(opts.body instanceof FormData) ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Algo ha fallado. Vuelve a intentarlo.");
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [garage, setGarage] = useState([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const d = await api("/api/auth/me");
      setUser(d.user);
      setGarage(d.garage || []);
    } catch {
      setUser(null);
      setGarage([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const register = useCallback(async ({ name, username, email, password }) => {
    await api("/api/auth/register", { method: "POST", body: JSON.stringify({ name, username, email, password }) });
    await refresh();
  }, [refresh]);

  const login = useCallback(async ({ email, password }) => {
    await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    setGarage([]);
  }, []);

  const saveSki = useCallback(
    (ski, profile) => {
      if (!user) return false;
      const temp = { ...ski, id: `tmp-${skiKey(ski)}`, clave: skiKey(ski), profile };
      setGarage((g) => (g.some((x) => x.clave === temp.clave) ? g : [temp, ...g]));
      api("/api/garaje", { method: "POST", body: JSON.stringify({ ski, profile }) }).then(refresh).catch(refresh);
      return true;
    },
    [user, refresh]
  );

  const removeSki = useCallback((id) => {
    setGarage((g) => g.filter((x) => x.id !== id));
    api(`/api/garaje?id=${id}`, { method: "DELETE" }).catch(refresh);
  }, [refresh]);

  const restoreSki = useCallback((item) => {
    setGarage((g) => [item, ...g]);
    api("/api/garaje", { method: "POST", body: JSON.stringify({ ski: item, profile: item.profile }) })
      .then(refresh)
      .catch(refresh);
  }, [refresh]);

  const updateNote = useCallback((id, note) => {
    setGarage((g) => g.map((x) => (x.id === id ? { ...x, note } : x)));
    api("/api/garaje", { method: "PATCH", body: JSON.stringify({ id, note }) }).catch(refresh);
  }, [refresh]);

  const isSaved = useCallback((ski) => garage.some((g) => g.clave === skiKey(ski)), [garage]);

  const value = useMemo(
    () => ({ user, ready, register, login, logout, refresh, garage, saveSki, removeSki, restoreSki, updateNote, isSaved }),
    [user, ready, register, login, logout, refresh, garage, saveSki, removeSki, restoreSki, updateNote, isSaved]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
export { api };
