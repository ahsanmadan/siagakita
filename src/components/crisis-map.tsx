"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, MapPin, RefreshCw, TriangleAlert } from "lucide-react";
import maplibregl, { type Map as MapLibreMap, type Marker, type PaddingOptions } from "maplibre-gl";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { CrisisStatus } from "@/lib/types";

export interface MapPoint {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status: CrisisStatus;
  kind: "Kejadian" | "Posko" | "Gempa";
  detail: string;
  updatedAt?: string;
  source?: string;
  sourceUrl?: string;
}

type MarkerRecord = {
  marker: Marker;
  element: HTMLButtonElement;
  point: MapPoint;
};

export function CrisisMap({
  points,
  center = [117, -2.5],
  zoom = 3.6,
  className,
  publicMode = false,
  selectedPointId,
  onPointSelect,
  showControls = true,
  controlPosition = "top-right",
  fitBoundsPadding = 72,
  rainRadarEnabled = false,
}: {
  points: MapPoint[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  publicMode?: boolean;
  selectedPointId?: string;
  onPointSelect?: (point: MapPoint) => void;
  showControls?: boolean;
  controlPosition?: "top-right" | "bottom-right";
  fitBoundsPadding?: number | PaddingOptions;
  rainRadarEnabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MarkerRecord[]>([]);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    const apiKey = process.env.NEXT_PUBLIC_STADIA_MAPS_API_KEY;
    const baseStyle = process.env.NEXT_PUBLIC_STADIA_STYLE_URL ?? "https://tiles.stadiamaps.com/styles/alidade_smooth.json";
    const style = apiKey ? `${baseStyle}${baseStyle.includes("?") ? "&" : "?"}api_key=${apiKey}` : baseStyle;

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center,
        zoom,
        attributionControl: false,
      });
      mapRef.current = map;
      resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(containerRef.current);
      if (showControls) {
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), controlPosition);
      }
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      loadTimer = setTimeout(() => {
        if (!disposed && !map.loaded()) {
          setLoading(false);
          setFailed(true);
        }
      }, 15000);
      map.once("load", () => {
        if (loadTimer) clearTimeout(loadTimer);
        setLoading(false);
        setFailed(false);
        if (rainRadarEnabled) {
          void fetch("https://api.rainviewer.com/public/weather-maps.json")
            .then((response) => response.json())
            .then((metadata: { host?: string; radar?: { nowcast?: { path: string }[]; past?: { path: string }[] } }) => {
              if (disposed || !metadata.host || !map.loaded()) return;
              const radarFrames = metadata.radar?.nowcast?.length ? metadata.radar.nowcast : metadata.radar?.past;
              const latestFrame = radarFrames?.at(-1);
              if (!latestFrame) return;
              const tileUrl = `${metadata.host}${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`;

              if (map.getLayer("rainviewer-radar")) map.removeLayer("rainviewer-radar");
              if (map.getSource("rainviewer-radar")) map.removeSource("rainviewer-radar");
              map.addSource("rainviewer-radar", {
                type: "raster",
                tiles: [tileUrl],
                tileSize: 256,
                minzoom: 0,
                maxzoom: 10,
                attribution: "Radar hujan RainViewer",
              });
              map.addLayer({
                id: "rainviewer-radar",
                type: "raster",
                source: "rainviewer-radar",
                paint: { "raster-opacity": 0.42 },
              });
            })
            .catch(() => {
              // Peta tetap berguna tanpa layer radar eksternal.
            });
        }
        resizeTimer = setTimeout(() => {
          if (disposed) return;
          map.resize();
          if (points.length > 1) {
            const bounds = points.reduce(
              (nextBounds, point) => nextBounds.extend([point.longitude, point.latitude]),
              new maplibregl.LngLatBounds(
                [points[0].longitude, points[0].latitude],
                [points[0].longitude, points[0].latitude],
              ),
            );
            map.fitBounds(bounds, { padding: fitBoundsPadding, maxZoom: 7.25, duration: 0 });
          }
        }, 180);
      });

      markersRef.current = points.map((point) => {
        const element = document.createElement("button");
        element.className = "crisis-map-marker";
        element.dataset.status = point.status;
        element.dataset.kind = point.kind;
        element.dataset.selected = "false";
        element.type = "button";
        element.setAttribute("aria-label", `${point.kind}: ${point.name}`);
        element.addEventListener("click", () => onPointSelect?.(point));
        element.innerHTML = point.kind === "Posko"
          ? '<svg class="crisis-marker-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5"/><path d="M7 10.5V20h10v-9.5"/><path d="M10 20v-5h4v5"/></svg>'
          : point.kind === "Gempa"
            ? '<svg class="crisis-marker-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h3l2-5 4 10 2-5h7"/><path d="M12 3v3"/><path d="M12 18v3"/></svg>'
            : '<svg class="crisis-marker-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 21 20H3L12 4Z"/><path d="M12 9v5"/><path d="M12 17h.01"/></svg>';

        const popupNode = document.createElement("div");
        popupNode.className = "min-w-52 p-1";
        const title = document.createElement("strong");
        title.textContent = point.name;
        const location = document.createElement("p");
        location.className = "mt-1 text-xs opacity-70";
        location.textContent = point.location;
        const detail = document.createElement("p");
        detail.className = "mt-2 text-xs leading-5";
        detail.textContent = publicMode ? "Informasi agregat yang aman untuk publik." : point.detail;
        popupNode.append(title, location, detail);

        const popup = new maplibregl.Popup({ offset: 20, closeButton: false }).setDOMContent(popupNode);
        const marker = new maplibregl.Marker({ element }).setLngLat([point.longitude, point.latitude]).setPopup(popup).addTo(map);
        return { marker, element, point };
      });
    } catch {
      queueMicrotask(() => {
        if (!disposed) setFailed(true);
      });
    }

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      if (loadTimer) clearTimeout(loadTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [center, controlPosition, fitBoundsPadding, onPointSelect, points, publicMode, rainRadarEnabled, retryKey, showControls, zoom]);

  useEffect(() => {
    markersRef.current.forEach(({ element, point }) => {
      element.dataset.selected = point.id === selectedPointId ? "true" : "false";
    });
    const selected = markersRef.current.find(({ point }) => point.id === selectedPointId);
    if (selected && mapRef.current?.loaded()) {
      mapRef.current.easeTo({
        center: [selected.point.longitude, selected.point.latitude],
        duration: 320,
        essential: false,
      });
    }
  }, [selectedPointId]);

  if (failed) {
    return (
      <div className={cn("grid min-h-96 place-items-center rounded-[var(--radius-lg)] border bg-card p-4", className)}>
        <Empty className="w-full border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon"><TriangleAlert className="text-status-major" /></EmptyMedia>
            <EmptyTitle>Peta belum dapat dimuat</EmptyTitle>
            <EmptyDescription>Periksa koneksi atau konfigurasi Stadia Maps. Data lokasi tetap tersedia di daftar.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
          <Button className="min-h-11" variant="outline" onClick={() => { setFailed(false); setLoading(true); setRetryKey((value) => value + 1); }}>
              <RefreshCw /> Muat ulang peta
            </Button>
          </EmptyContent>
          <div className="mt-5 space-y-2 text-left">
            {points.slice(0, 3).map((point) => (
              <div key={point.id} className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <MapPin className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{point.name}</p><p className="truncate text-xs text-muted-foreground">{point.location}</p></div>
                <StatusBadge status={point.status} className="hidden sm:flex" />
              </div>
            ))}
          </div>
        </Empty>
      </div>
    );
  }

  return (
    <div className={cn("relative min-h-96 w-full overflow-clip rounded-[var(--radius-lg)] bg-muted", className)}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {loading ? (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-card/72 backdrop-blur-sm" role="status" aria-label="Memuat peta">
          <div className="flex items-center gap-3 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm"><LoaderCircle className="size-4 animate-spin text-primary" /> Memuat peta situasi</div>
        </div>
      ) : null}
    </div>
  );
}
