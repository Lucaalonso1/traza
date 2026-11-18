"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { DIFICULTAD } from "@/lib/format";
import Icon from "../Icon";

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const BASES = {
  satelite: {
    label: "Satélite",
    tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`],
    attribution: "Imágenes © Esri, Maxar, Earthstar Geographics",
    maxzoom: 18,
    paint: { "raster-brightness-max": 0.86, "raster-saturation": -0.1, "raster-contrast": 0.05 },
  },
  topo: {
    label: "Topográfico",
    tiles: ["a", "b", "c"].map((s) => `https://${s}.tile.opentopomap.org/{z}/{x}/{y}.png`),
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxzoom: 17,
    paint: { "raster-brightness-max": 0.8, "raster-saturation": -0.35 },
  },
  oscuro: {
    label: "Oscuro",
    tiles: [`${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`],
    attribution: "© Esri, HERE, Garmin, OpenStreetMap",
    maxzoom: 16,
    paint: {},
  },
};

const spotsGeoJSON = (spots) => ({
  type: "FeatureCollection",
  features: spots.map((s) => ({
    type: "Feature",
    id: s.id,
    geometry: s.geom,
    properties: { id: s.id, nombre: s.nombre, color: DIFICULTAD[s.dificultad]?.color ?? "#fff", dash: s.dificultad === "doble_negra" ? 1 : 0 },
  })),
});

const draftGeoJSON = (coords) => ({
  type: "FeatureCollection",
  features: [
    ...(coords.length > 1 ? [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }] : []),
    ...coords.map((c, i) => ({ type: "Feature", geometry: { type: "Point", coordinates: c }, properties: { i } })),
  ],
});

/**
 * Mapa de Traza.
 * - stations: estaciones (marcadores de cristal)
 * - spots: rutas (líneas) y spots (puntos) coloreados por dificultad
 * - draft + onMapClick: modo dibujo para publicar una ruta
 * - fit: lista de [lng, lat] a encuadrar; selected: id de spot resaltado
 */
export default function MapView({ stations = [], spots = [], draft, onMapClick, onSpot, onStation, fit, selected, className = "", initialBase = "satelite" }) {
  const box = useRef(null);
  const map = useRef(null);
  const lib = useRef(null);
  const markers = useRef([]);
  const handlers = useRef({});
  const fitted = useRef(false);
  const [base, setBase] = useState(initialBase);
  const [ready, setReady] = useState(false);
  handlers.current = { onMapClick, onSpot, onStation };

  // Crear el mapa una sola vez
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("maplibre-gl");
      const maplibregl = mod.Map ? mod : mod.default;
      // MapLibre 6 carga su worker como módulo aparte: lo servimos desde /public
      maplibregl.setWorkerUrl?.(`${location.origin}/vendor/maplibre-gl-worker.mjs`);
      if (cancelled || !box.current) return;
      lib.current = maplibregl;
      const b = BASES[initialBase];
      const m = new maplibregl.Map({
        container: box.current,
        style: {
          version: 8,
          sources: { base: { type: "raster", tiles: b.tiles, tileSize: 256, attribution: b.attribution, maxzoom: b.maxzoom } },
          layers: [{ id: "base", type: "raster", source: "base", paint: b.paint }],
        },
        center: [2.2, 43.4],
        zoom: 5,
        attributionControl: { compact: true },
        cooperativeGestures: false,
      });
      m.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), "bottom-right");
      m.on("load", () => {
        m.addSource("spots", { type: "geojson", data: spotsGeoJSON([]) });
        m.addLayer({ id: "spots-glow", type: "line", source: "spots", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": ["get", "color"], "line-width": 10, "line-opacity": 0.18, "line-blur": 4 } });
        m.addLayer({ id: "spots-line", type: "line", source: "spots", filter: ["==", ["geometry-type"], "LineString"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["get", "color"], "line-width": ["case", ["boolean", ["feature-state", "sel"], false], 5, 3], "line-dasharray": ["case", ["==", ["get", "dash"], 1], ["literal", [1.5, 1.2]], ["literal", [1, 0]]] } });
        m.addLayer({ id: "spots-point", type: "circle", source: "spots", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": ["case", ["boolean", ["feature-state", "sel"], false], 9, 6.5], "circle-color": ["get", "color"], "circle-stroke-color": "#06090d", "circle-stroke-width": 2.5 } });
        m.addSource("draft", { type: "geojson", data: draftGeoJSON([]) });
        m.addLayer({ id: "draft-line", type: "line", source: "draft", filter: ["==", ["geometry-type"], "LineString"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#f2774a", "line-width": 4 } });
        m.addLayer({ id: "draft-point", type: "circle", source: "draft", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 5, "circle-color": "#fff", "circle-stroke-color": "#f2774a", "circle-stroke-width": 2.5 } });
        for (const layer of ["spots-line", "spots-point"]) {
          m.on("click", layer, (e) => {
            e.preventDefault();
            handlers.current.onSpot?.(e.features[0].properties.id);
          });
          m.on("mouseenter", layer, () => (m.getCanvas().style.cursor = "pointer"));
          m.on("mouseleave", layer, () => (m.getCanvas().style.cursor = ""));
        }
        m.on("click", (e) => {
          if (e.defaultPrevented) return;
          handlers.current.onMapClick?.([+e.lngLat.lng.toFixed(6), +e.lngLat.lat.toFixed(6)]);
        });
        setReady(true);
      });
      map.current = m;
    })();
    return () => {
      cancelled = true;
      markers.current.forEach((mk) => mk.remove());
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Capa base
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const b = BASES[base];
    m.removeLayer("base");
    m.removeSource("base");
    m.addSource("base", { type: "raster", tiles: b.tiles, tileSize: 256, attribution: b.attribution, maxzoom: b.maxzoom });
    m.addLayer({ id: "base", type: "raster", source: "base", paint: b.paint }, "spots-glow");
  }, [base, ready]);

  // Spots
  useEffect(() => {
    if (ready) map.current.getSource("spots").setData(spotsGeoJSON(spots));
  }, [spots, ready]);

  // Spot seleccionado
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    spots.forEach((s) => m.setFeatureState({ source: "spots", id: s.id }, { sel: s.id === selected }));
  }, [selected, spots, ready]);

  // Dibujo
  useEffect(() => {
    if (ready && draft) map.current.getSource("draft").setData(draftGeoJSON(draft));
    if (ready && map.current) map.current.getCanvas().style.cursor = onMapClick ? "crosshair" : "";
  }, [draft, ready, onMapClick]);

  // Estaciones
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !lib.current) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = stations.map((s) => {
      const el = document.createElement("button");
      el.className = "map-station";
      el.type = "button";
      el.setAttribute("aria-label", `Estación ${s.nombre}`);
      el.innerHTML = `<span class="ms-dot"></span><span class="ms-name">${s.nombre}</span>`;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        handlers.current.onStation?.(s);
      });
      return new lib.current.Marker({ element: el, anchor: "left", offset: [-7, 0] }).setLngLat([s.lng, s.lat]).addTo(m);
    });
  }, [stations, ready]);

  // Encuadre
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !fit?.length || !lib.current) return;
    // El primer encuadre es instantáneo; los siguientes, animados
    const duration = fitted.current ? 900 : 0;
    fitted.current = true;
    if (fit.length === 1) m.flyTo({ center: fit[0], zoom: 12.5, duration, essential: true });
    else {
      const bounds = fit.reduce((b, c) => b.extend(c), new lib.current.LngLatBounds(fit[0], fit[0]));
      m.fitBounds(bounds, { padding: 70, maxZoom: 13.5, duration, essential: true });
    }
  }, [fit, ready]);

  return (
    <div className={`map-wrap ${className}`}>
      <div ref={box} className="map-canvas" />
      <div className="map-base segmented" role="tablist" aria-label="Tipo de mapa">
        {Object.entries(BASES).map(([k, b]) => (
          <button key={k} role="tab" aria-selected={base === k} onClick={() => setBase(k)}>
            {k === "topo" && <Icon name="layers" size={14} />} {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
