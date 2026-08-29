"use client";

import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityLogIcon, BoxIcon, CheckCircledIcon, Cross2Icon, DrawingPinFilledIcon, HomeIcon, ReloadIcon, UpdateIcon } from "@radix-ui/react-icons";
import maplibregl, { type IControl, type Map as MapLibreMap, type Marker, type PaddingOptions } from "maplibre-gl";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { CrisisStatus } from "@/lib/types";

export interface MapPoint {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status: CrisisStatus;
  kind: "Kejadian" | "Posko" | "Gempa" | "Critical Need" | "Distribution";
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

type CameraFocusMode = "operational" | "dynamic";

type PointFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: {
      id: string;
      kind: MapPoint["kind"];
      status: CrisisStatus;
      name: string;
    };
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
  }>;
};

type LineFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: {
      id: string;
      status: CrisisStatus;
    };
    geometry: {
      type: "LineString";
      coordinates: [[number, number], [number, number]];
    };
  }>;
};

type OperationalGeoJson = PointFeatureCollection | LineFeatureCollection;
type GeoJsonSetDataSource = {
  setData: (data: OperationalGeoJson) => void;
};

const incidentKinds = new Set<MapPoint["kind"]>(["Kejadian", "Gempa"]);
const incidentFocusRadius = 1.35;
const singlePointFocusRadius = 0.18;
const operationalMaxZoom = 10.5;
const operationalSourceId = "siagakita-operational-points";
const distributionSourceId = "siagakita-distribution-lines";
const openFreeMapLibertyStyle = "https://tiles.openfreemap.org/styles/liberty";
const locationNoticeMessage = "SiagaKita belum memiliki izin untuk menggunakan lokasi Anda.";

const markerLegend = [
  { label: "Incident", kind: "Kejadian" as const, icon: ActivityLogIcon, tone: "bg-status-critical text-white" },
  { label: "Shelter", kind: "Posko" as const, icon: HomeIcon, tone: "bg-primary text-primary-foreground" },
  { label: "Critical Need", kind: "Critical Need" as const, icon: BoxIcon, tone: "bg-status-warning text-foreground" },
  { label: "Distribution", kind: "Distribution" as const, icon: CheckCircledIcon, tone: "bg-status-info text-white" },
];

function markerIconSvg(kind: MapPoint["kind"]) {
  if (kind === "Posko") {
    // Shelter / Tent clean glyph
    return '<svg class="crisis-marker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2l7-14a2 2 0 0 1 3.6 0l7 14a2 2 0 0 1-2 2z"/><path d="M12 11v10"/></svg>';
  }
  if (kind === "Gempa") {
    // Epicenter / Seismic pulse clean glyph
    return '<svg class="crisis-marker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m12.72-4.24a12 12 0 0 1 0 16.97m-16.96 0a12 12 0 0 1 0-16.97"/></svg>';
  }
  if (kind === "Critical Need") {
    // Warning triangle clean glyph
    return '<svg class="crisis-marker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
  }
  if (kind === "Distribution") {
    // Package box clean glyph
    return '<svg class="crisis-marker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>';
  }
  // Disaster / Event — Emergency pin with beacon
  return '<svg class="crisis-marker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="currentColor"/></svg>';
}

function createOperationalLegendControl(): IControl {
  let container: HTMLDivElement | null = null;

  return {
    onAdd() {
      container = document.createElement("div");
      container.className = "maplibregl-ctrl rounded-xl border bg-card/90 p-3 shadow-sm backdrop-blur";
      container.setAttribute("aria-label", "Crisis Situation Map legend");
      container.innerHTML = `
        <div class="grid max-w-[16rem] grid-cols-2 gap-2">
          ${markerLegend.map(({ label, kind, tone }) => `
            <div class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span class="grid size-6 place-items-center rounded-lg ${tone}">
                ${markerIconSvg(kind)}
              </span>
              <span>${label}</span>
            </div>
          `).join("")}
        </div>
      `;
      return container;
    },
    onRemove() {
      container?.remove();
      container = null;
    },
  };
}

function primaryIncident(points: MapPoint[]) {
  return points.find((point) => incidentKinds.has(point.kind) && point.status !== "safe") ??
    points.find((point) => incidentKinds.has(point.kind)) ??
    null;
}

function nearbyOperationalPoints(points: MapPoint[]) {
  const incident = primaryIncident(points);
  if (!incident) return points;

  const nearby = points.filter((point) => {
    const latDistance = Math.abs(point.latitude - incident.latitude);
    const lngDistance = Math.abs(point.longitude - incident.longitude);
    return point.id === incident.id || (latDistance <= incidentFocusRadius && lngDistance <= incidentFocusRadius);
  });

  return nearby.length > 1 ? nearby : [incident];
}

function pointDistance(point: MapPoint, target: [number, number]) {
  return Math.hypot(point.longitude - target[0], point.latitude - target[1]);
}

function nearestPoint(points: MapPoint[], target: [number, number]) {
  return points.reduce<MapPoint | null>((nearest, point) => {
    if (!nearest) return point;
    return pointDistance(point, target) < pointDistance(nearest, target) ? point : nearest;
  }, null);
}

function dynamicCameraPoints(points: MapPoint[], map?: MapLibreMap | null) {
  if (points.length <= 3) return points;
  if (!map?.loaded()) return points;

  const center = map.getCenter();
  const nearest = nearestPoint(points, [center.lng, center.lat]);
  if (!nearest) return points;

  const localClusterRadius = map.getZoom() >= 6 ? 2.35 : 4.75;
  const cluster = points.filter((point) => pointDistance(point, [nearest.longitude, nearest.latitude]) <= localClusterRadius);

  return cluster.length >= 2 ? cluster : points;
}

function cameraPoints(points: MapPoint[], mode: CameraFocusMode, map?: MapLibreMap | null) {
  return mode === "dynamic" ? dynamicCameraPoints(points, map) : nearbyOperationalPoints(points);
}

function centerForPoints(points: MapPoint[], fallback: [number, number], mode: CameraFocusMode = "operational", map?: MapLibreMap | null) {
  const focusPoints = cameraPoints(points, mode, map);
  if (mode === "operational") {
    const incident = primaryIncident(focusPoints);
    if (incident) return [incident.longitude, incident.latitude] as [number, number];
  }

  if (!focusPoints.length) return fallback;

  const total = focusPoints.reduce((result, point) => ({
    latitude: result.latitude + point.latitude,
    longitude: result.longitude + point.longitude,
  }), { latitude: 0, longitude: 0 });

  return [total.longitude / focusPoints.length, total.latitude / focusPoints.length] as [number, number];
}

function boundsForPoints(points: MapPoint[], mode: CameraFocusMode = "operational", map?: MapLibreMap | null) {
  const focusPoints = cameraPoints(points, mode, map);
  if (!focusPoints.length) return null;
  const base = focusPoints.length === 1
    ? [
        {
          ...focusPoints[0],
          latitude: focusPoints[0].latitude - singlePointFocusRadius,
          longitude: focusPoints[0].longitude - singlePointFocusRadius,
        },
        {
          ...focusPoints[0],
          latitude: focusPoints[0].latitude + singlePointFocusRadius,
          longitude: focusPoints[0].longitude + singlePointFocusRadius,
        },
      ]
    : focusPoints;

  return base.reduce(
    (bounds, point) => bounds.extend([point.longitude, point.latitude]),
    new maplibregl.LngLatBounds([base[0].longitude, base[0].latitude], [base[0].longitude, base[0].latitude]),
  );
}

function markerKindLabel(kind: MapPoint["kind"]) {
  if (kind === "Kejadian" || kind === "Gempa") return "Incident";
  if (kind === "Posko") return "Shelter";
  return kind;
}

function mapStyleUrl() {
  return process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? openFreeMapLibertyStyle;
}

function pointFeatures(points: MapPoint[]): PointFeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      properties: {
        id: point.id,
        kind: point.kind,
        status: point.status,
        name: point.name,
      },
      geometry: {
        type: "Point",
        coordinates: [point.longitude, point.latitude],
      },
    })),
  };
}

function nearestAnchor(point: MapPoint, anchors: MapPoint[]) {
  return anchors.reduce<MapPoint | null>((nearest, anchor) => {
    if (!nearest) return anchor;
    const currentDistance = Math.hypot(point.latitude - anchor.latitude, point.longitude - anchor.longitude);
    const nearestDistance = Math.hypot(point.latitude - nearest.latitude, point.longitude - nearest.longitude);
    return currentDistance < nearestDistance ? anchor : nearest;
  }, null);
}

function distributionFeatures(points: MapPoint[]): LineFeatureCollection {
  const anchors = points.filter((point) => point.kind === "Posko" || incidentKinds.has(point.kind));

  return {
    type: "FeatureCollection",
    features: points
      .filter((point) => point.kind === "Distribution")
      .flatMap((point) => {
        const anchor = nearestAnchor(point, anchors.filter((item) => item.id !== point.id));
        if (!anchor) return [];

        return [{
          type: "Feature" as const,
          properties: {
            id: point.id,
            status: point.status,
          },
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [anchor.longitude, anchor.latitude],
              [point.longitude, point.latitude],
            ] as [[number, number], [number, number]],
          },
        }];
      }),
  };
}

function hasSetData(source: unknown): source is GeoJsonSetDataSource {
  return typeof (source as { setData?: unknown } | undefined)?.setData === "function";
}

function syncOperationalLayers(map: MapLibreMap, points: MapPoint[]) {
  const source = map.getSource(operationalSourceId);
  const lineSource = map.getSource(distributionSourceId);

  if (hasSetData(source)) {
    source.setData(pointFeatures(points));
  } else {
    map.addSource(operationalSourceId, {
      type: "geojson",
      data: pointFeatures(points),
    });
  }

  if (hasSetData(lineSource)) {
    lineSource.setData(distributionFeatures(points));
  } else {
    map.addSource(distributionSourceId, {
      type: "geojson",
      data: distributionFeatures(points),
    });
  }

  if (!map.getLayer("siagakita-distribution-connector")) {
    map.addLayer({
      id: "siagakita-distribution-connector",
      type: "line",
      source: distributionSourceId,
      paint: {
        "line-color": "#1b75bc",
        "line-width": 3,
        "line-opacity": 0.58,
        "line-dasharray": [1.4, 1.1],
      },
    });
  }

  if (!map.getLayer("siagakita-incident-radius")) {
    map.addLayer({
      id: "siagakita-incident-radius",
      type: "circle",
      source: operationalSourceId,
      filter: ["in", ["get", "kind"], ["literal", ["Kejadian", "Gempa"]]],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 22, 9, 54, 12, 92],
        "circle-color": "#d9534f",
        "circle-opacity": 0.13,
        "circle-stroke-color": "#b7292d",
        "circle-stroke-opacity": 0.36,
        "circle-stroke-width": 1.5,
      },
    });
  }

  if (!map.getLayer("siagakita-critical-need-emphasis")) {
    map.addLayer({
      id: "siagakita-critical-need-emphasis",
      type: "circle",
      source: operationalSourceId,
      filter: ["==", ["get", "kind"], "Critical Need"],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 12, 9, 26, 12, 42],
        "circle-color": "#f2c94c",
        "circle-opacity": 0.22,
        "circle-stroke-color": "#b36b00",
        "circle-stroke-opacity": 0.48,
        "circle-stroke-width": 1.25,
      },
    });
  }
}

function popupNodeForPoint(point: MapPoint, publicMode: boolean) {
  const popupNode = document.createElement("div");
  popupNode.className = "min-w-56 p-1";
  const title = document.createElement("strong");
  title.textContent = point.name;
  const meta = document.createElement("div");
  meta.className = "mt-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal";
  const kind = document.createElement("span");
  kind.textContent = markerKindLabel(point.kind);
  const status = document.createElement("span");
  status.className = "rounded-full border px-2 py-0.5";
  status.textContent = point.status;
  meta.append(kind, status);
  const location = document.createElement("p");
  location.className = "mt-1 text-xs opacity-70";
  location.textContent = point.location;
  const detail = document.createElement("p");
  detail.className = "mt-2 text-xs leading-5";
  detail.textContent = publicMode ? "Info aman untuk warga." : point.detail;
  const updated = document.createElement("p");
  updated.className = "mt-2 text-xs opacity-60";
  updated.textContent = point.updatedAt
    ? `Diperbarui ${point.updatedAt}${point.source ? ` · ${point.source}` : ""}`
    : point.source
      ? `Sumber ${point.source}`
      : "";
  popupNode.append(title, meta, location, detail);
  if (updated.textContent) popupNode.append(updated);
  return popupNode;
}

function focusMapPoint(map: MapLibreMap, point: MapPoint, publicMode: boolean) {
  const currentZoom = map.getZoom();
  const targetZoom = point.kind === "Posko"
    ? 13.4
    : point.kind === "Kejadian" || point.kind === "Gempa"
      ? 12.35
      : 13;
  const nextZoom = Math.min(Math.max(currentZoom, targetZoom), 15);
  const zoomDistance = Math.abs(nextZoom - currentZoom);
  const offset: [number, number] = publicMode && window.matchMedia("(min-width: 1024px)").matches ? [160, 0] : [0, 0];

  map.easeTo({
    center: [point.longitude, point.latitude],
    zoom: nextZoom,
    offset,
    duration: zoomDistance > 4 ? 1150 : 860,
    easing: (time) => 1 - Math.pow(1 - time, 3),
    essential: false,
  });
}

function shouldUseMapPopup(publicMode: boolean) {
  return !publicMode || window.matchMedia("(min-width: 1024px)").matches;
}

function syncMarkers(
  map: MapLibreMap,
  markerRecords: MarkerRecord[],
  points: MapPoint[],
  publicMode: boolean,
  selectedPointId: string | undefined,
  onPointSelect: ((point: MapPoint) => void) | undefined,
) {
  const recordsById = new Map(markerRecords.map((record) => [record.point.id, record]));
  const nextIds = new Set(points.map((point) => point.id));

  markerRecords.forEach((record) => {
    if (!nextIds.has(record.point.id)) {
      record.marker.remove();
    }
  });

  return points.map((point) => {
    const existing = recordsById.get(point.id);

    if (existing) {
      existing.point = point;
      existing.element.dataset.status = point.status;
      existing.element.dataset.kind = point.kind;
      existing.element.dataset.selected = point.id === selectedPointId ? "true" : "false";
      existing.element.setAttribute("aria-label", `${point.kind}: ${point.name}`);
      existing.element.innerHTML = markerIconSvg(point.kind);
      existing.element.onclick = () => {
        focusMapPoint(map, point, publicMode);
        onPointSelect?.(point);
      };
      existing.marker.setLngLat([point.longitude, point.latitude]);
      existing.marker.getPopup()?.remove();
      existing.marker.setPopup(shouldUseMapPopup(publicMode)
        ? new maplibregl.Popup({ offset: 20, closeButton: false }).setDOMContent(popupNodeForPoint(point, publicMode))
        : undefined);

      return existing;
    }

    const element = document.createElement("button");
    element.className = "crisis-map-marker";
    element.dataset.status = point.status;
    element.dataset.kind = point.kind;
    element.dataset.selected = point.id === selectedPointId ? "true" : "false";
    element.type = "button";
    element.setAttribute("aria-label", `${point.kind}: ${point.name}`);
    element.onclick = () => {
      focusMapPoint(map, point, publicMode);
      onPointSelect?.(point);
    };
    element.innerHTML = markerIconSvg(point.kind);

    const marker = new maplibregl.Marker({ element })
      .setLngLat([point.longitude, point.latitude]);

    if (shouldUseMapPopup(publicMode)) {
      marker.setPopup(new maplibregl.Popup({ offset: 20, closeButton: false })
        .setDOMContent(popupNodeForPoint(point, publicMode)));
    }

    marker.addTo(map);

    return { marker, element, point };
  });
}

function moveCameraToPoints(
  map: MapLibreMap,
  points: MapPoint[],
  fallbackCenter: [number, number],
  fallbackZoom: number,
  padding: number | PaddingOptions,
  duration: number,
  mode: CameraFocusMode,
) {
  const focusPoints = cameraPoints(points, mode, map);
  const bounds = boundsForPoints(points, mode, map);
  if (bounds) {
    if (focusPoints.length === 1) {
      map.easeTo({
        center: [focusPoints[0].longitude, focusPoints[0].latitude],
        zoom: Math.min(Math.max(map.getZoom(), 11), 13.25),
        duration,
        essential: false,
      });
      return;
    }

    map.fitBounds(bounds, { padding, maxZoom: operationalMaxZoom, duration, essential: false });
    return;
  }

  map.easeTo({ center: fallbackCenter, zoom: fallbackZoom, duration, essential: false });
}

function pointPosition(point: MapPoint, points: MapPoint[], index: number) {
  const sameKindIndex = points.slice(0, index).filter((item) => item.kind === point.kind).length;
  const lane: Record<MapPoint["kind"], { left: number; top: number; dx: number; dy: number }> = {
    Kejadian: { left: 78, top: 24, dx: -7, dy: 16 },
    Gempa: { left: 78, top: 24, dx: -7, dy: 16 },
    Posko: { left: 33, top: 36, dx: 9, dy: 18 },
    "Critical Need": { left: 50, top: 56, dx: 10, dy: 12 },
    Distribution: { left: 24, top: 24, dx: 9, dy: 12 },
  };
  const currentLane = lane[point.kind];
  const left = currentLane.left + (sameKindIndex % 3) * currentLane.dx;
  const top = currentLane.top + Math.floor(sameKindIndex / 3) * currentLane.dy;

  return {
    left: `${Math.min(84, Math.max(16, left))}%`,
    top: `${Math.min(80, Math.max(14, top))}%`,
  };
}

function OperationalMapView({
  points,
  publicMode,
  selectedPointId,
  onPointSelect,
  action,
  showOperationalPoints,
}: {
  points: MapPoint[];
  publicMode: boolean;
  selectedPointId?: string;
  onPointSelect?: (point: MapPoint) => void;
  action?: ReactNode;
  showOperationalPoints: boolean;
}) {
  const visiblePoints = points.length ? points : [{
    id: "operational-map-origin",
    name: "Crisis Situation Map",
    location: "Wilayah operasi",
    latitude: -0.36,
    longitude: 100.41,
    status: "warning" as const,
    kind: "Kejadian" as const,
    detail: "Menunggu titik layanan.",
  }];

  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(145deg,#eef8f5_0%,#dfeee9_48%,#f7f4ea_100%)]">
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(24,78,119,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(24,78,119,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute inset-x-6 top-1/2 h-px rotate-[-8deg] bg-status-info/45" />
      <div className="absolute left-1/4 top-0 h-full w-px rotate-[22deg] bg-status-info/30" />
      <div className="absolute bottom-8 right-10 h-28 w-44 rounded-[45%] border border-status-info/25 bg-status-info/10" />
      {showOperationalPoints ? <div className="absolute left-6 top-5 z-10 rounded-xl border bg-card/86 px-3 py-2 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">Peta dasar belum siap</p>
        <p className="mt-1 text-sm font-semibold">Titik layanan tetap tersedia</p>
      </div> : null}
      {showOperationalPoints && !publicMode ? <div className="absolute right-4 top-4 z-10 hidden max-w-[16rem] grid-cols-2 gap-2 rounded-xl border bg-card/86 p-3 shadow-sm backdrop-blur sm:grid">
        {markerLegend.map(({ label, icon: Icon, tone }) => (
          <div key={label} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className={cn("grid size-6 place-items-center rounded-lg", tone)}><Icon className="size-3.5" /></span>
            {label}
          </div>
        ))}
      </div> : null}
      {showOperationalPoints ? visiblePoints.map((point, index) => {
        const position = pointPosition(point, visiblePoints, index);
        const selected = point.id === selectedPointId;
        const Icon = markerLegend.find((item) => item.kind === point.kind)?.icon ?? DrawingPinFilledIcon;

        return (
          <button
            key={point.id}
            type="button"
            className={cn(
              "group absolute z-20 -translate-x-1/2 -translate-y-1/2 text-left transition hover:z-30 hover:-translate-y-[calc(50%+2px)] focus-visible:z-30 focus-visible:-translate-y-[calc(50%+2px)]",
              selected && "ring-2 ring-primary",
            )}
            style={position}
            onClick={() => onPointSelect?.(point)}
            aria-label={`${point.kind}: ${point.name}`}
          >
            <span className="flex flex-col items-center gap-1">
              <span className={cn("grid size-10 place-items-center rounded-full border-2 border-card text-white shadow-lg ring-8", point.status === "critical" ? "bg-status-critical ring-status-critical/16" : point.status === "major" ? "bg-status-major ring-status-major/18" : point.status === "warning" ? "bg-status-warning text-foreground ring-status-warning/22" : "bg-status-safe ring-status-safe/18")}>
                <Icon className="size-4" />
              </span>
              <span className="hidden max-w-28 truncate rounded-full border bg-card/90 px-2 py-1 text-center text-xs font-semibold shadow-sm backdrop-blur sm:block">{point.name}</span>
            </span>
            <div className="pointer-events-none absolute left-1/2 top-full mt-2 hidden w-56 -translate-x-1/2 rounded-xl border bg-card/95 p-3 text-xs leading-5 text-muted-foreground shadow-lg group-hover:block group-focus-visible:block">
              <p className="font-semibold text-foreground">{point.location}</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={point.status} className="h-6 text-xs" />
                <span>{point.kind === "Kejadian" ? "Incident" : point.kind === "Posko" ? "Shelter" : point.kind}</span>
              </div>
              <p className="mt-2">{publicMode ? "Info aman untuk warga." : point.detail}</p>
            </div>
          </button>
        );
      }) : null}
      {showOperationalPoints ? <div className="absolute inset-x-4 bottom-4 z-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        {!publicMode ? <div className="grid grid-cols-2 gap-2 rounded-xl border bg-card/88 p-2 shadow-sm backdrop-blur sm:hidden">
          {markerLegend.map(({ label, icon: Icon, tone }) => (
            <div key={label} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className={cn("grid size-6 place-items-center rounded-lg", tone)}><Icon className="size-3.5" /></span>
              {label}
            </div>
          ))}
        </div> : null}
        <div className="rounded-xl border bg-card/88 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
          {visiblePoints.length} titik layanan tersedia
        </div>
        {action}
      </div> : null}
    </div>
  );
}

export function CrisisMap({
  points,
  center = [117, -2.5],
  zoom = 3.6,
  className,
  publicMode = false,
  selectedPointId,
  focusedPoint,
  onPointSelect,
  showControls = true,
  controlPosition = "top-right",
  fitBoundsPadding = 72,
  resetViewSignal = 0,
  focusPointSignal = 0,
  cameraFocusMode = publicMode ? "dynamic" : "operational",
  showUserLocationControl = publicMode,
}: {
  points: MapPoint[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  publicMode?: boolean;
  selectedPointId?: string;
  focusedPoint?: MapPoint;
  onPointSelect?: (point: MapPoint) => void;
  showControls?: boolean;
  controlPosition?: "top-right" | "bottom-right";
  fitBoundsPadding?: number | PaddingOptions;
  resetViewSignal?: number;
  focusPointSignal?: number;
  cameraFocusMode?: CameraFocusMode;
  showUserLocationControl?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MarkerRecord[]>([]);
  const latestPointsRef = useRef(points);
  const latestCenterRef = useRef(center);
  const latestZoomRef = useRef(zoom);
  const latestPaddingRef = useRef(fitBoundsPadding);
  const latestPublicModeRef = useRef(publicMode);
  const latestSelectedPointIdRef = useRef(selectedPointId);
  const latestOnPointSelectRef = useRef(onPointSelect);
  const latestCameraFocusModeRef = useRef<CameraFocusMode>(cameraFocusMode);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const locationNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialCameraFitDoneRef = useRef(false);

  const showLocationNotice = useCallback((message: string) => {
    setLocationNotice(message);
    if (locationNoticeTimerRef.current) clearTimeout(locationNoticeTimerRef.current);
    locationNoticeTimerRef.current = setTimeout(() => setLocationNotice(null), 10000);
  }, []);

  useLayoutEffect(() => {
    latestPointsRef.current = points;
    latestCenterRef.current = center;
    latestZoomRef.current = zoom;
    latestPaddingRef.current = fitBoundsPadding;
    latestPublicModeRef.current = publicMode;
    latestSelectedPointIdRef.current = selectedPointId;
    latestOnPointSelectRef.current = onPointSelect;
    latestCameraFocusModeRef.current = cameraFocusMode;
  }, [cameraFocusMode, center, fitBoundsPadding, onPointSelect, points, publicMode, selectedPointId, zoom]);

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    const initialPoints = latestPointsRef.current;
    const initialCenter = centerForPoints(initialPoints, latestCenterRef.current, latestCameraFocusModeRef.current);
    const style = mapStyleUrl();

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: initialCenter,
        zoom: initialPoints.length ? Math.max(latestZoomRef.current, 7.2) : latestZoomRef.current,
        attributionControl: false,
      });
      mapRef.current = map;
      resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(containerRef.current);
      if (showControls) {
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), controlPosition);
        if (showUserLocationControl) {
          const geolocateControl = new maplibregl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true,
              maximumAge: 5000,
              timeout: 12000,
            },
            fitBoundsOptions: { maxZoom: 15 },
            trackUserLocation: true,
            showAccuracyCircle: true,
            showUserLocation: true,
          });

          geolocateControl.on("error", () => {
            showLocationNotice(locationNoticeMessage);
          });
          geolocateControl.on("geolocate", () => {
            setLocationNotice(null);
          });
          geolocateControl.on("trackuserlocationstart", () => {
            setLocationNotice(null);
          });

          map.addControl(geolocateControl, controlPosition);
        }
      }
      if (!publicMode) {
        map.addControl(createOperationalLegendControl(), "top-right");
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
        syncOperationalLayers(map, latestPointsRef.current);
        markersRef.current = syncMarkers(
          map,
          markersRef.current,
          latestPointsRef.current,
          latestPublicModeRef.current,
          latestSelectedPointIdRef.current,
          latestOnPointSelectRef.current,
        );
        resizeTimer = setTimeout(() => {
          if (disposed) return;
          map.resize();
          moveCameraToPoints(
            map,
            latestPointsRef.current,
            latestCenterRef.current,
            latestZoomRef.current,
            latestPaddingRef.current,
            0,
            latestCameraFocusModeRef.current,
          );
        }, 180);
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
      if (locationNoticeTimerRef.current) clearTimeout(locationNoticeTimerRef.current);
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [controlPosition, publicMode, retryKey, showControls, showLocationNotice, showUserLocationControl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.loaded()) return;

    syncOperationalLayers(map, points);
    markersRef.current = syncMarkers(map, markersRef.current, points, publicMode, latestSelectedPointIdRef.current, onPointSelect);
    if (points.length && !initialCameraFitDoneRef.current) {
      initialCameraFitDoneRef.current = true;
      moveCameraToPoints(map, points, center, zoom, fitBoundsPadding, 620, cameraFocusMode);
    }
  }, [cameraFocusMode, center, fitBoundsPadding, onPointSelect, points, publicMode, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.loaded() || resetViewSignal === 0) return;

    const bounds = boundsForPoints(points, cameraFocusMode, map);
    if (bounds) {
      map.fitBounds(bounds, { padding: fitBoundsPadding, maxZoom: operationalMaxZoom, duration: 260 });
      return;
    }

    map.easeTo({ center, zoom, duration: 260, essential: false });
  }, [cameraFocusMode, center, fitBoundsPadding, points, resetViewSignal, zoom]);

  useEffect(() => {
    markersRef.current.forEach(({ element, point }) => {
      element.dataset.selected = point.id === selectedPointId ? "true" : "false";
    });
    const selected = focusedPoint ?? markersRef.current.find(({ point }) => point.id === selectedPointId)?.point;
    const map = mapRef.current;
    if (selected && map) {
      focusMapPoint(map, selected, publicMode);
    }
  }, [focusedPoint, focusPointSignal, publicMode, selectedPointId]);

  return (
    <div className={cn("relative min-h-96 w-full overflow-clip rounded-[var(--radius-lg)] bg-muted", className)}>
      <OperationalMapView
        points={points}
        publicMode={publicMode}
        selectedPointId={selectedPointId}
        onPointSelect={onPointSelect}
        showOperationalPoints={failed}
        action={failed ? (
          <Button className="min-h-10 bg-card/92 backdrop-blur" variant="outline" onClick={() => { setFailed(false); setLoading(true); setRetryKey((value) => value + 1); }}>
            <ReloadIcon /> Coba muat ulang
          </Button>
        ) : undefined}
      />
      <div ref={containerRef} className={cn("absolute inset-0 h-full w-full transition-opacity", loading || failed ? "opacity-0" : "opacity-100")} />
      {loading ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2" role="status" aria-label="Menyiapkan peta">
          <div className="flex items-center gap-3 rounded-full border bg-card/90 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur"><UpdateIcon className="size-4 animate-spin text-primary" /> Menyiapkan peta</div>
        </div>
      ) : null}
      {locationNotice ? (
        <div className="public-map-location-notice" role="status" aria-live="polite">
          <DrawingPinFilledIcon className="size-5 shrink-0" />
          <p>{locationNotice}</p>
          <button type="button" onClick={() => setLocationNotice(null)} aria-label="Tutup pemberitahuan lokasi">
            <Cross2Icon className="size-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
