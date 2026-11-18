import Hero from "@/components/Hero";
import { FinalCta, Manifesto } from "@/components/Sections";
import { ExplorePreview, FeatureReel, Stats, StationsMarquee } from "@/components/HomeSections";
import { feed, homeStats, stations } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [sts, posts, stats] = await Promise.all([
    stations().catch(() => []),
    feed({ limit: 12 }).catch(() => []),
    homeStats().catch(() => null),
  ]);
  // El clip de Luca Alonso es el destacado; si no está, el clip más reciente
  const featured =
    posts.find((p) => p.username === "luca.alonso" && p.tipo === "clip") ?? posts.find((p) => p.tipo === "clip") ?? posts[0];
  const side = posts.filter((p) => p !== featured && p.medios?.length).slice(0, 3);
  return (
    <>
      <Hero />
      <Manifesto />
      <ExplorePreview featured={featured} posts={side} />
      <FeatureReel />
      <Stats stats={stats} />
      <StationsMarquee stations={sts} />
      <FinalCta />
    </>
  );
}
