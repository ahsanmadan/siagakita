"use client";

import { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { UpdateIcon } from "@radix-ui/react-icons";
import maplibregl, { type Map as MapLibreMap, type Marker, type PaddingOptions } from "maplibre-gl";
import { PublicMapStatus } from "@/components/public-map-status";
import { cn } from "@/lib/utils";
import type { CrisisStatus, DistributionStatus } from "@/lib/types";

export interface VolcanoCctv {
  locationName: string;
  label: string;
  imageUrl: string;
}

export interface VolcanoObservationReport {
  period?: string;
  volcanoName?: string;
  author?: string;
  visualSummary?: string;
  detailUrl?: string;
}

export interface VolcanoEruptionReport {
  time: string;
  volcanoName: string;
  author: string;
  description: string;
  imageUrl?: string;
  detailUrl?: string;
}

export interface MapPoint {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status: CrisisStatus;
  kind: "Kejadian" | "Posko" | "Gempa" | "Gunung Api" | "Critical Need" | "Distribution";
  isErupting?: boolean;
  eruptionReport?: VolcanoEruptionReport;
  observationReport?: VolcanoObservationReport;
  cctvList?: VolcanoCctv[];
  hasCctv?: boolean;
  cctvCount?: number;
  shakemapUrl?: string;
  magnitude?: string;
  depth?: string;
  feltScale?: string;
  tsunamiPotential?: string;
  detail: string;
  updatedAt?: string;
  timestampMs?: number;
  source?: string;
  sourceUrl?: string;
  // Logistics Fleet Tracking (Last Known Update Model)
  isStale?: boolean;
  vehicleCode?: string;
  vehicleName?: string;
  destinationShelter?: string;
  cargoSummary?: string;
  progressPercent?: number;
  etaText?: string;
  distributionStatus?: DistributionStatus;
  lastLocationName?: string;
  driverNote?: string;
  checkpointHistory?: Array<{
    status: string;
    location: string;
    note?: string | null;
    updatedByRole: string;
    createdAt: string;
  }>;
}

type MarkerRecord = {
  id: string;
  marker: Marker;
  element: HTMLButtonElement;
  point?: MapPoint;
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

const incidentKinds = new Set<MapPoint["kind"]>(["Kejadian", "Gempa", "Gunung Api"]);
const incidentFocusRadius = 1.35;
const singlePointFocusRadius = 0.18;
const operationalMaxZoom = 10.5;
const operationalSourceId = "siagakita-operational-points";
const distributionSourceId = "siagakita-distribution-lines";
const publicClusterSourceId = "siagakita-public-clusters";
const publicClusterCircleLayerId = "siagakita-public-cluster-circles";
const publicClusterCountLayerId = "siagakita-public-cluster-count";
const openFreeMapLibertyStyle = "https://tiles.openfreemap.org/styles/liberty";
const publicClusterMaxZoom = 8.75;
const publicClusterPixelRadius = 48;

function geographicPoints(points: MapPoint[]) {
  const pointsById = new Map<string, MapPoint>();

  for (const point of points) {
    if (
      !point.id ||
      !Number.isFinite(point.longitude) ||
      !Number.isFinite(point.latitude) ||
      (point.longitude === 0 && point.latitude === 0) ||
      point.longitude < -180 ||
      point.longitude > 180 ||
      point.latitude < -90 ||
      point.latitude > 90
    ) continue;

    pointsById.set(point.id, point);
  }

  return [...pointsById.values()];
}


function markerIconSvg(kind: MapPoint["kind"]) {
  if (kind === "Posko") {
    // Shelter / Tent clean glyph
    return '<svg class="crisis-marker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2l7-14a2 2 0 0 1 3.6 0l7 14a2 2 0 0 1-2 2z"/><path d="M12 11v10"/></svg>';
  }
  if (kind === "Gempa") {
    // Epicenter / Seismic pulse clean glyph
    return '<svg class="crisis-marker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m12.72-4.24a12 12 0 0 1 0 16.97m-16.96 0a12 12 0 0 1 0-16.97"/></svg>';
  }
  if (kind === "Gunung Api") {
    // Volcano mountain with crater and magma glyph
    return '<svg class="crisis-marker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 21 7-13 3 5 3-5 7 13H2Z"/><path d="M8.5 12h7"/><circle cx="12" cy="4" r="1.5" fill="currentColor"/></svg>';
  }
  if (kind === "Critical Need") {
    // Warning triangle clean glyph
    return '<svg class="crisis-marker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
  }
  if (kind === "Distribution") {
    // Truck clean glyph for logistics vehicle fleet
    return '<svg class="crisis-marker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>';
  }
  // Disaster / Event — Emergency pin with beacon
  return '<svg class="crisis-marker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="currentColor"/></svg>';
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
  if (kind === "Kejadian" || kind === "Gempa") return "Kejadian";
  if (kind === "Gunung Api") return "Gunung api";
  if (kind === "Posko") return "Posko";
  if (kind === "Critical Need") return "Kebutuhan kritis";
  if (kind === "Distribution") return "Mobil Logistik";
  return kind;
}

function markerStatusLabel(status: CrisisStatus) {
  return {
    critical: "Kritis",
    major: "Siaga",
    warning: "Waspada",
    safe: "Aman",
  }[status];
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
      filter: [
        "all",
        ["in", ["get", "kind"], ["literal", ["Kejadian", "Gunung Api"]]],
        ["!=", ["get", "status"], "safe"],
      ],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 22, 9, 54, 12, 92],
        "circle-color": [
          "match",
          ["get", "status"],
          "critical", "#dc2626",
          "major", "#ea580c",
          "warning", "#eab308",
          "safe", "#059669",
          "#dc2626",
        ],
        "circle-opacity": 0.09,
        "circle-stroke-color": [
          "match",
          ["get", "status"],
          "critical", "#b91c1c",
          "major", "#c2410c",
          "warning", "#ca8a04",
          "safe", "#047857",
          "#b91c1c",
        ],
        "circle-stroke-opacity": 0.28,
        "circle-stroke-width": 1.25,
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

function syncPublicClusterLayers(map: MapLibreMap, points: MapPoint[], selectedPointId?: string) {
  const clusterPoints = points.filter((point) => point.id !== selectedPointId);
  const source = map.getSource(publicClusterSourceId);

  if (hasSetData(source)) {
    source.setData(pointFeatures(clusterPoints));
  } else {
    map.addSource(publicClusterSourceId, {
      type: "geojson",
      data: pointFeatures(clusterPoints),
      cluster: true,
      clusterMaxZoom: publicClusterMaxZoom,
      clusterRadius: publicClusterPixelRadius,
      clusterProperties: {
        dangerCount: ["+", ["case", ["any", ["==", ["get", "status"], "critical"], ["==", ["get", "kind"], "Critical Need"]], 1, 0]],
        warningCount: ["+", ["case", ["all", ["in", ["get", "kind"], ["literal", ["Gunung Api", "Gempa"]]], ["in", ["get", "status"], ["literal", ["major", "warning"]]]], 1, 0]],
        logisticsCount: ["+", ["case", ["in", ["get", "kind"], ["literal", ["Posko", "Distribution"]]], 1, 0]],
      },
    });
  }

  if (!map.getLayer(publicClusterCircleLayerId)) {
    map.addLayer({
      id: publicClusterCircleLayerId,
      type: "circle",
      source: publicClusterSourceId,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "case",
          [">", ["get", "dangerCount"], 0], "#dc2626",
          [">", ["get", "warningCount"], 0], "#ea580c",
          ["==", ["get", "logisticsCount"], ["get", "point_count"]], "#2563eb",
          "#64748b",
        ],
        "circle-radius": ["step", ["get", "point_count"], 20, 10, 23, 30, 27],
        "circle-stroke-width": 0,
      },
    });
  }

  if (!map.getLayer(publicClusterCountLayerId)) {
    map.addLayer({
      id: publicClusterCountLayerId,
      type: "symbol",
      source: publicClusterSourceId,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": 12,
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#ffffff",
      },
    });
  }
}

function markerPointsForMap(map: MapLibreMap, points: MapPoint[], publicMode: boolean, selectedPointId?: string, focusedPointId?: string) {
  if (!publicMode) return points;

  const pinnedIds = new Set([selectedPointId, focusedPointId].filter(Boolean));
  if (!map.getSource(publicClusterSourceId) || !map.isSourceLoaded(publicClusterSourceId)) {
    return points.filter((point) => pinnedIds.has(point.id));
  }

  const unclusteredIds = new Set(
    map.querySourceFeatures(publicClusterSourceId, { filter: ["!", ["has", "point_count"]] })
      .map((feature) => String(feature.properties?.id)),
  );

  return points.filter((point) => pinnedIds.has(point.id) || unclusteredIds.has(point.id));
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
  status.textContent = point.kind === "Distribution"
    ? (point.isStale ? "Update Terakhir" : "Dalam Perjalanan")
    : markerStatusLabel(point.status);
  meta.append(kind, status);
  const location = document.createElement("p");
  location.className = "mt-1 text-xs opacity-70";
  location.textContent = point.location;
  const detail = document.createElement("p");
  detail.className = "mt-2 text-xs leading-5";
  detail.textContent = publicMode
    ? point.kind === "Gunung Api" || point.kind === "Gempa" || point.kind === "Distribution"
      ? point.detail
      : "Info aman untuk warga."
    : point.detail;
  const updated = document.createElement("p");
  updated.className = "mt-2 text-xs opacity-60";
  if (point.kind === "Distribution") {
    updated.textContent = point.isStale
      ? `Terakhir terlihat ${point.updatedAt} (Menunggu update supir)`
      : `Lokasi diperbarui ${point.updatedAt}${point.source ? ` · ${point.source}` : ""}`;
  } else {
    updated.textContent = point.updatedAt
      ? `Diperbarui ${point.updatedAt}${point.source ? ` · ${point.source}` : ""}`
      : point.source
        ? `Sumber ${point.source}`
        : "";
  }
  popupNode.append(title, meta, location);

  if (point.kind === "Gunung Api") {
    const visualUrl = point.eruptionReport?.imageUrl || point.cctvList?.[0]?.imageUrl;
    if (visualUrl) {
      const img = document.createElement("img");
      img.src = visualUrl;
      img.alt = point.name;
      img.className = "mt-2 w-full h-24 object-cover rounded border border-neutral-200 dark:border-neutral-700";
      popupNode.append(img);
    }
  } else if (point.kind === "Gempa" && point.shakemapUrl) {
    const img = document.createElement("img");
    img.src = point.shakemapUrl;
    img.alt = `Peta Guncangan ${point.name}`;
    img.className = "mt-2 w-full h-28 object-cover rounded border border-neutral-200 dark:border-neutral-700";
    popupNode.append(img);
  }

  popupNode.append(detail);
  if (updated.textContent) popupNode.append(updated);
  return popupNode;
}

function focusMapPoint(map: MapLibreMap, point: MapPoint, publicMode: boolean) {
  const currentZoom = map.getZoom();
  const targetZoom = point.kind === "Posko"
    ? 13.4
    : point.kind === "Kejadian" || point.kind === "Gempa" || point.kind === "Gunung Api"
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

export function getVolcanoLevel(point: MapPoint): number {
  const text = `${point.name} ${point.detail ?? ""}`;
  if (/Level\s+IV|Awas/i.test(text)) return 4;
  if (/Level\s+III|Siaga/i.test(text)) return 3;
  if (/Level\s+II|Waspada/i.test(text)) return 2;
  if (/Level\s+I|Normal/i.test(text)) return 1;

  if (point.status === "critical") return 4;
  if (point.status === "major") return 3;
  if (point.status === "warning") return 2;
  return 1;
}

function resolveEarthquakeIcon(point: MapPoint, isLatest?: boolean): { iconUrl: string; isFelt: boolean; isLatest: boolean } {
  const text = `${point.name} ${point.detail ?? ""}`;
  const isFelt = point.status === "critical" || point.status === "major" || /dirasakan|merusak|tsunami|mmi/i.test(text);
  const iconUrl = isFelt ? "/icons/earthquake/gb-t.png" : "/icons/earthquake/gb.png";
  return { iconUrl, isFelt, isLatest: Boolean(isLatest) };
}

function resolveVolcanoIcon(point: MapPoint): { iconUrl: string; isErupting: boolean; level: number } {
  const level = getVolcanoLevel(point);
  const text = `${point.name} ${point.detail ?? ""}`;
  const isErupting = typeof point.isErupting === "boolean"
    ? point.isErupting
    : /erupsi|letusan|awan panas|lontaran material|kolom abu/i.test(text);

  const iconUrl = isErupting ? `/icons/volcano/erupt${level}.gif` : `/icons/volcano/${level}.png`;
  return { iconUrl, isErupting, level };
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
  focusedPointId?: string,
) {
  const recordsById = new Map(markerRecords.map((record) => [record.id, record]));
  const markerPoints = markerPointsForMap(map, points, publicMode, selectedPointId, focusedPointId);
  const nextIds = new Set(markerPoints.map((point) => point.id));

  markerRecords.forEach((record) => {
    if (!nextIds.has(record.id)) {
      record.marker.remove();
    }
  });

  const latestEarthquakeId = points
    .filter((p) => p.kind === "Gempa")
    .sort((a, b) => (b.timestampMs ?? 0) - (a.timestampMs ?? 0))[0]?.id;

  return markerPoints.map((point) => {
    const existing = recordsById.get(point.id);

    if (existing) {
      existing.id = point.id;
      existing.point = point;
      existing.element.classList.add("crisis-map-marker");
      existing.element.dataset.status = point.status;
      existing.element.dataset.kind = point.kind;
      existing.element.dataset.selected = point.id === selectedPointId ? "true" : "false";
      if (point.kind === "Distribution") {
        existing.element.dataset.stale = point.isStale ? "true" : "false";
      } else {
        existing.element.removeAttribute("data-stale");
      }
      existing.element.setAttribute("aria-label", `${point.kind}: ${point.name}`);
      if (point.kind === "Gempa") {
        existing.element.removeAttribute("data-erupting");
        existing.element.removeAttribute("data-volcano-level");
        existing.element.style.removeProperty("--bubble-size");
        const isLatest = point.id === latestEarthquakeId;
        const { iconUrl, isFelt } = resolveEarthquakeIcon(point, isLatest);
        existing.element.dataset.latest = isLatest ? "true" : "false";
        existing.element.dataset.felt = isFelt ? "true" : "false";
        existing.element.innerHTML = `<img class="earthquake-marker-img" src="${iconUrl}" alt="${point.name}" loading="lazy" />`;
      } else if (point.kind === "Gunung Api") {
        existing.element.style.removeProperty("--bubble-size");
        existing.element.removeAttribute("data-latest");
        existing.element.removeAttribute("data-felt");
        const { iconUrl, isErupting, level } = resolveVolcanoIcon(point);
        existing.element.dataset.erupting = isErupting ? "true" : "false";
        existing.element.dataset.volcanoLevel = String(level);
        existing.element.innerHTML = `<img class="volcano-marker-img" src="${iconUrl}" alt="${point.name}" loading="lazy" />`;
      } else {
        existing.element.removeAttribute("data-erupting");
        existing.element.removeAttribute("data-volcano-level");
        existing.element.removeAttribute("data-latest");
        existing.element.removeAttribute("data-felt");
        existing.element.style.removeProperty("--bubble-size");
        existing.element.innerHTML = markerIconSvg(point.kind);
      }
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
    element.classList.add("crisis-map-marker");
    element.dataset.status = point.status;
    element.dataset.kind = point.kind;
    element.dataset.selected = point.id === selectedPointId ? "true" : "false";
    if (point.kind === "Distribution") {
      element.dataset.stale = point.isStale ? "true" : "false";
    }
    element.type = "button";
    element.setAttribute("aria-label", `${point.kind}: ${point.name}`);
    element.onclick = () => {
      focusMapPoint(map, point, publicMode);
      onPointSelect?.(point);
    };
    if (point.kind === "Gempa") {
      const isLatest = point.id === latestEarthquakeId;
      const { iconUrl, isFelt } = resolveEarthquakeIcon(point, isLatest);
      element.dataset.latest = isLatest ? "true" : "false";
      element.dataset.felt = isFelt ? "true" : "false";
      element.innerHTML = `<img class="earthquake-marker-img" src="${iconUrl}" alt="${point.name}" loading="lazy" />`;
    } else if (point.kind === "Gunung Api") {
      const { iconUrl, isErupting, level } = resolveVolcanoIcon(point);
      element.dataset.erupting = isErupting ? "true" : "false";
      element.dataset.volcanoLevel = String(level);
      element.innerHTML = `<img class="volcano-marker-img" src="${iconUrl}" alt="${point.name}" loading="lazy" />`;
    } else {
      element.innerHTML = markerIconSvg(point.kind);
    }

    const marker = new maplibregl.Marker({
      element,
      anchor: point.kind === "Gunung Api" ? "bottom" : "center",
    })
      .setLngLat([point.longitude, point.latitude]);

    if (shouldUseMapPopup(publicMode)) {
      marker.setPopup(new maplibregl.Popup({ offset: 20, closeButton: false })
        .setDOMContent(popupNodeForPoint(point, publicMode)));
    }

    marker.addTo(map);

    return { id: point.id, marker, element, point };
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

function OperationalMapView({
  points,
  publicMode,
  action,
  showOperationalPoints,
}: {
  points: MapPoint[];
  publicMode: boolean;
  action?: ReactNode;
  showOperationalPoints: boolean;
}) {
  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[linear-gradient(145deg,#eef8f5_0%,#dfeee9_48%,#f7f4ea_100%)]"
      suppressHydrationWarning
    >
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(24,78,119,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(24,78,119,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute inset-x-6 top-1/2 h-px rotate-[-8deg] bg-status-info/45" />
      <div className="absolute left-1/4 top-0 h-full w-px rotate-[22deg] bg-status-info/30" />
      <div className="absolute bottom-8 right-10 h-28 w-44 rounded-[45%] border border-status-info/25 bg-status-info/10" />
      {showOperationalPoints ? <div className="absolute left-6 top-5 z-10 rounded-xl border bg-card/86 px-3 py-2 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">Peta dasar belum siap</p>
        <p className="mt-1 text-sm font-semibold">Daftar lokasi tetap tersedia di panel</p>
      </div> : null}
      {showOperationalPoints ? <div className="absolute inset-x-4 bottom-4 z-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="rounded-xl border bg-card/88 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
          {points.length} titik tercantum di panel
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
  const anchoredPoints = useMemo(
    () => geographicPoints(focusedPoint ? [...points, focusedPoint] : points),
    [focusedPoint, points],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MarkerRecord[]>([]);
  const latestPointsRef = useRef(anchoredPoints);
  const latestCenterRef = useRef(center);
  const latestZoomRef = useRef(zoom);
  const latestPaddingRef = useRef(fitBoundsPadding);
  const latestPublicModeRef = useRef(publicMode);
  const latestSelectedPointIdRef = useRef(selectedPointId);
  const latestFocusedPointIdRef = useRef(focusedPoint?.id);
  const latestOnPointSelectRef = useRef(onPointSelect);
  const latestCameraFocusModeRef = useRef<CameraFocusMode>(cameraFocusMode);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationNotice, setLocationNotice] = useState<{ title: string; description: string } | null>(null);
  const [markerFailed, setMarkerFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const locationNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialCameraFitDoneRef = useRef(false);

  const showLocationNotice = useCallback((title: string, description: string) => {
    setLocationNotice({ title, description });
    if (locationNoticeTimerRef.current) clearTimeout(locationNoticeTimerRef.current);
    locationNoticeTimerRef.current = setTimeout(() => setLocationNotice(null), 10000);
  }, []);

  useLayoutEffect(() => {
    latestPointsRef.current = anchoredPoints;
    latestCenterRef.current = center;
    latestZoomRef.current = zoom;
    latestPaddingRef.current = fitBoundsPadding;
    latestPublicModeRef.current = publicMode;
    latestSelectedPointIdRef.current = selectedPointId;
    latestFocusedPointIdRef.current = focusedPoint?.id;
    latestOnPointSelectRef.current = onPointSelect;
    latestCameraFocusModeRef.current = cameraFocusMode;
  }, [anchoredPoints, cameraFocusMode, center, fitBoundsPadding, focusedPoint, onPointSelect, publicMode, selectedPointId, zoom]);

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
        fadeDuration: 0,
        renderWorldCopies: false,
        maxTileCacheSize: 150,
        refreshExpiredTiles: false,
      });
      mapRef.current = map;
      resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(containerRef.current);
      // Aktifkan scrollZoom native dengan sensitivitas yang responsif dan mulus
      map.scrollZoom.enable();
      map.scrollZoom.setZoomRate(1 / 250);
      map.scrollZoom.setWheelZoomRate(1 / 450);

      if (showControls) {
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

          geolocateControl.on("error", (error) => {
            const denied = "code" in error && error.code === 1;
            showLocationNotice(
              denied ? "Izin lokasi ditolak" : "Lokasi tidak ditemukan",
              denied
                ? "Peta tetap dapat digunakan. Izinkan akses lokasi melalui pengaturan browser lalu coba lagi."
                : "Sinyal lokasi belum tersedia atau permintaan melewati batas waktu. Coba dari area yang lebih terbuka.",
            );
          });
          geolocateControl.on("geolocate", () => {
            setLocationNotice(null);
          });
          geolocateControl.on("trackuserlocationstart", () => {
            setLocationNotice(null);
          });

          map.addControl(geolocateControl, controlPosition);
        }
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), controlPosition);
        map.addControl(new maplibregl.NavigationControl({ showZoom: false, showCompass: true, visualizePitch: true }), controlPosition);
        map.addControl(new maplibregl.FullscreenControl(), controlPosition);
      }

      map.addControl(new maplibregl.AttributionControl({ compact: true }), publicMode ? "bottom-left" : "bottom-right");
      [
        [".maplibregl-ctrl-geolocate", "Pusatkan lokasi saya"],
        [".maplibregl-ctrl-zoom-in", "Perbesar peta"],
        [".maplibregl-ctrl-zoom-out", "Perkecil peta"],
        [".maplibregl-ctrl-compass", "Arah utara"],
        [".maplibregl-ctrl-fullscreen", "Layar penuh"],
        [".maplibregl-ctrl-attrib-button", "Informasi peta"],
      ].forEach(([selector, label]) => {
        const button = containerRef.current?.querySelector<HTMLButtonElement>(selector);
        if (button) {
          button.setAttribute("aria-label", label);
          button.setAttribute("title", label);
        }
      });
      const syncMapLayers = () => {
        try {
          syncOperationalLayers(map, latestPointsRef.current);
          if (latestPublicModeRef.current) {
            syncPublicClusterLayers(map, latestPointsRef.current, latestSelectedPointIdRef.current);
          }
          setMarkerFailed(false);
        } catch {
          setMarkerFailed(true);
        }
      };
      const syncRenderedMarkers = () => {
        try {
          markersRef.current = syncMarkers(
            map,
            markersRef.current,
            latestPointsRef.current,
            latestPublicModeRef.current,
            latestSelectedPointIdRef.current,
            latestOnPointSelectRef.current,
            latestFocusedPointIdRef.current,
          );
          setMarkerFailed(false);
        } catch {
          setMarkerFailed(true);
        }
      };

      map.on("style.load", syncMapLayers);
      map.on("data", (event) => {
        if (
          "sourceId" in event && event.sourceId === publicClusterSourceId &&
          "isSourceLoaded" in event && event.isSourceLoaded
        ) syncRenderedMarkers();
      });
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
        syncMapLayers();
        syncRenderedMarkers();
        map.on("zoomend", syncRenderedMarkers);
        if (latestPublicModeRef.current) {
          map.on("click", publicClusterCircleLayerId, (event) => {
            const feature = event.features?.[0];
            if (!feature || feature.geometry.type !== "Point") return;
            const [longitude, latitude] = feature.geometry.coordinates;
            map.easeTo({
              center: [longitude, latitude],
              zoom: Math.min(map.getZoom() + 2, publicClusterMaxZoom + 2),
              duration: 360,
              essential: false,
            });
          });
          map.on("mouseenter", publicClusterCircleLayerId, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", publicClusterCircleLayerId, () => { map.getCanvas().style.cursor = ""; });
        }
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
    if (!map?.isStyleLoaded()) return;

    syncOperationalLayers(map, anchoredPoints);
    if (publicMode) syncPublicClusterLayers(map, anchoredPoints, latestSelectedPointIdRef.current);
    markersRef.current = syncMarkers(map, markersRef.current, anchoredPoints, publicMode, latestSelectedPointIdRef.current, onPointSelect, latestFocusedPointIdRef.current);
    if (anchoredPoints.length && !initialCameraFitDoneRef.current) {
      initialCameraFitDoneRef.current = true;
      moveCameraToPoints(map, anchoredPoints, center, zoom, fitBoundsPadding, 620, cameraFocusMode);
    }
  }, [anchoredPoints, cameraFocusMode, center, fitBoundsPadding, onPointSelect, publicMode, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded() || resetViewSignal === 0) return;

    const bounds = boundsForPoints(anchoredPoints, cameraFocusMode, map);
    if (bounds) {
      map.fitBounds(bounds, { padding: fitBoundsPadding, maxZoom: operationalMaxZoom, duration: 260 });
      return;
    }

    map.easeTo({ center, zoom, duration: 260, essential: false });
  }, [anchoredPoints, cameraFocusMode, center, fitBoundsPadding, resetViewSignal, zoom]);

  useEffect(() => {
    markersRef.current.forEach(({ element, point }) => {
      if (point) element.dataset.selected = point.id === selectedPointId ? "true" : "false";
    });
    const selected = focusedPoint ?? latestPointsRef.current.find((point) => point.id === selectedPointId);
    const map = mapRef.current;
    if (map?.isStyleLoaded()) {
      if (publicMode) syncPublicClusterLayers(map, latestPointsRef.current, selectedPointId);
      markersRef.current = syncMarkers(map, markersRef.current, latestPointsRef.current, publicMode, selectedPointId, latestOnPointSelectRef.current, focusedPoint?.id);
    }
    if (selected && map) {
      focusMapPoint(map, selected, publicMode);
    }
  }, [focusedPoint, focusPointSignal, publicMode, selectedPointId]);

  return (
    <div
      className={cn("relative min-h-96 w-full overflow-clip rounded-[var(--radius-lg)] bg-muted", className)}
      suppressHydrationWarning
    >
      <OperationalMapView
        points={anchoredPoints}
        publicMode={publicMode}
        showOperationalPoints={failed}
        action={failed ? (
          <PublicMapStatus
            tone="critical"
            title="Peta gagal dimuat"
            description="Peta dasar tidak tersedia. Daftar lokasi di panel tetap dapat digunakan."
            actionLabel="Muat ulang"
            onAction={() => { setFailed(false); setLoading(true); setMarkerFailed(false); setRetryKey((value) => value + 1); }}
          />
        ) : undefined}
      />
      <div ref={containerRef} className={cn("absolute inset-0 h-full w-full transition-opacity", loading || failed ? "opacity-0" : "opacity-100")} />
      {loading ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2" role="status" aria-label="Menyiapkan peta">
          <div className="flex items-center gap-3 rounded-full border bg-card/90 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur"><UpdateIcon className="size-4 animate-spin text-primary" /> Menyiapkan peta</div>
        </div>
      ) : null}
      {markerFailed && !failed ? (
        <PublicMapStatus
          compact
          className="public-map-marker-status"
          tone="warning"
          title="Sebagian marker gagal muncul"
          description="Daftar lokasi tetap lengkap. Muat ulang peta untuk mencoba menampilkan marker kembali."
          actionLabel="Coba lagi"
          onAction={() => { setMarkerFailed(false); setLoading(true); setRetryKey((value) => value + 1); }}
        />
      ) : null}
      {locationNotice ? (
        <PublicMapStatus
          className="public-map-location-notice"
          tone="warning"
          title={locationNotice.title}
          description={locationNotice.description}
          actionLabel="Coba lagi"
          onAction={() => containerRef.current?.querySelector<HTMLButtonElement>(".maplibregl-ctrl-geolocate")?.click()}
          secondaryActionLabel="Tutup"
          onSecondaryAction={() => setLocationNotice(null)}
        />
      ) : null}
    </div>
  );
}
