import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server/auth";
import { stations } from "@/lib/server/queries";
import Settings from "@/components/social/Settings";

export const metadata = { title: "Ajustes — Traza" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await currentUser();
  if (!u) redirect("/acceso?next=/ajustes");
  const sts = (await stations()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  return (
    <div className="page page-narrow">
      <Settings user={u} stations={sts} />
    </div>
  );
}
