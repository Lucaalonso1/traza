import { route, currentUser, q } from "@/lib/server/auth";

export const GET = route(async () => {
  const user = await currentUser();
  if (!user) return Response.json({ user: null, garage: [] });
  const garage = await q(
    `SELECT id, clave, marca, modelo, categoria, longitud_cm AS longitudCm, patin_mm AS patinMm, radio_m AS radioM,
            encaje, por_que AS porQue, perfil AS profile, nota AS note, creado_en AS savedAt
     FROM garaje WHERE usuario_id = :u ORDER BY creado_en DESC`,
    { u: user.id }
  );
  return Response.json({ user: { ...user, name: user.nombre }, garage });
});
