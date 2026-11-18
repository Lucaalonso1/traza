import Hero from "@/components/Hero";
import { FinalCta, HowItWorks, Manifesto, StationsGrid } from "@/components/Sections";
import { stations } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sts = await stations().catch(() => []);
  return (
    <>
      <Hero />
      <Manifesto />
      <HowItWorks />
      <StationsGrid stations={sts} />
      <FinalCta />
    </>
  );
}
