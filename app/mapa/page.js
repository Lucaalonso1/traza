import MapExplorer from "@/components/map/MapExplorer";
import { currentUser } from "@/lib/server/auth";
import { spots, stations } from "@/lib/server/queries";

export const metadata = { title: "Mapa — Traza" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await currentUser();
  const [sts, sps] = await Promise.all([stations(), spots({ viewer: u?.id ?? 0 })]);
  return <MapExplorer stations={sts} spots={sps} />;
}
