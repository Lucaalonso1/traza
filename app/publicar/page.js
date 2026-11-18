import { Suspense } from "react";
import Publish from "@/components/social/Publish";
import { stations, spots } from "@/lib/server/queries";

export const metadata = { title: "Publicar — Traza" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const [sts, sps] = await Promise.all([stations(), spots()]);
  return (
    <div className="page page-publish">
      <Suspense>
        <Publish stations={sts.sort((a, b) => a.nombre.localeCompare(b.nombre))} spots={sps} />
      </Suspense>
    </div>
  );
}
