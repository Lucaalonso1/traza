"use client";
import { useRouter } from "next/navigation";
import MapView from "./MapView";

export default function StationMap({ station, spots, initialBase = "topo", hideStation = false }) {
  const router = useRouter();
  const pts = [[station.lng, station.lat], ...spots.flatMap((s) => (s.geom.type === "Point" ? [s.geom.coordinates] : s.geom.coordinates))];
  return (
    <MapView
      className="map-inline"
      stations={hideStation ? [] : [station]}
      spots={spots}
      fit={pts}
      initialBase={initialBase}
      onSpot={(id) => router.push(`/spots/${id}`)}
    />
  );
}
