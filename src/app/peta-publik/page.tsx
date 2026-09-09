import type { MapPoint } from "@/components/crisis-map";
import { PublicMapShell } from "@/components/public-map-shell";
import { getCurrentProfile } from "@/lib/auth";
import { getPublicMapData } from "@/lib/repositories/operations";
import { getAggregatedExternalAlerts } from "@/lib/repositories/external-alerts";
import type { DisasterEvent, Shelter } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PublicMapPage({
  searchParams,
}: {
  searchParams: Promise<{ kejadian?: string | string[] }>;
}) {
  const { kejadian } = await searchParams;
  const initialPointId = Array.isArray(kejadian) ? kejadian[0] : kejadian;

  const [mapData, currentUser, externalAlertsData] = await Promise.all([
    getPublicMapData(),
    getCurrentProfile().catch(() => null),
    getAggregatedExternalAlerts().catch(() => ({
      latestEarthquake: null,
      earthquakes: [],
      volcanoes: [],
      criticalVolcanoes: [],
      sources: ["BMKG", "PVMBG/Magma Indonesia"],
      mapPoints: [] as MapPoint[],
      tickerSummaries: [] as string[],
    })),
  ]);

  const { disasterEvents, shelters } = mapData;

  const points: MapPoint[] = [
    ...disasterEvents.map((event: DisasterEvent) => ({
      id: event.id,
      name: event.name,
      location: `${event.location}, ${event.province}`,
      latitude: event.coordinates.latitude,
      longitude: event.coordinates.longitude,
      status: event.status,
      kind: "Kejadian" as const,
      detail: event.summary,
      updatedAt: event.updatedAt,
      timestampMs: new Date(event.updatedAt).getTime() || Date.now(),
    })),
    ...shelters.map((shelter: Shelter) => ({
      id: shelter.id,
      name: shelter.name,
      location: shelter.location,
      latitude: shelter.coordinates.latitude,
      longitude: shelter.coordinates.longitude,
      status: shelter.status,
      kind: "Posko" as const,
      detail: "Informasi posko publik tersedia tanpa data pribadi.",
      updatedAt: shelter.lastUpdate,
      timestampMs: new Date(shelter.lastUpdate).getTime() || Date.now(),
    })),
    ...externalAlertsData.mapPoints,
  ];

  return (
    <PublicMapShell
      disasterEvents={disasterEvents}
      shelters={shelters}
      points={points}
      externalSources={externalAlertsData.sources}
      initialTickerSummaries={externalAlertsData.tickerSummaries}
      initialPointId={initialPointId}
      currentUser={currentUser}
    />
  );
}
