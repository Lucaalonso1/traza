import { Suspense } from "react";
import Recommender from "@/components/Recommender";

export const metadata = { title: "Elige tu esquí — Traza" };

export default function Page() {
  return (
    <div className="page page-rec">
      <Suspense>
        <Recommender />
      </Suspense>
    </div>
  );
}
