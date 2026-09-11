import type { MapPoint } from "@/components/crisis-map";
import { PublicMapShell } from "@/components/public-map-shell";
import { getCurrentProfile } from "@/lib/auth";
import { getPublicMapData } from "@/lib/repositories/operations";
import { getAggregatedExternalAlerts } from "@/lib/repositories/external-alerts";
import type { DisasterEvent, Distribution, Shelter } from "@/lib/types";

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

  const { disasterEvents, shelters, distributions = [], sourceState, sourceTimestamp } = mapData;

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
      timestampMs: new Date(event.updatedAt).getTime() || 0,
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
      timestampMs: new Date(shelter.lastUpdate).getTime() || 0,
    })),
    ...distributions
      .filter((dist: Distribution) => dist.lastCoordinates)
      .map((dist: Distribution) => ({
        id: dist.id,
        name: `${dist.vehicleCode || dist.id} (${dist.vehicleName || "Mobil Logistik"})`,
        location: dist.lastLocationName || `Menuju ${dist.destination}`,
        latitude: dist.lastCoordinates!.latitude,
        longitude: dist.lastCoordinates!.longitude,
        status: dist.status === "dalam-perjalanan" ? ("major" as const) : ("warning" as const),
        kind: "Distribution" as const,
        detail: `Muatan: ${dist.cargo}. Menuju ${dist.destination}. ${dist.isStale ? "Menunggu pembaruan lokasi dari supir armada." : ""}`,
        updatedAt: dist.lastUpdatedAt || "Berkala",
        timestampMs: dist.lastUpdatedAtIso ? new Date(dist.lastUpdatedAtIso).getTime() : Date.now(),
        source: dist.lastUpdatedByRole === "driver" ? "Pembaruan Supir Armada" : "Posko Bantuan",
        isStale: dist.isStale,
        vehicleCode: dist.vehicleCode,
        vehicleName: dist.vehicleName,
        destinationShelter: dist.destination,
        cargoSummary: dist.cargo,
        progressPercent: dist.progress,
        etaText: dist.eta,
        distributionStatus: dist.status,
        lastLocationName: dist.lastLocationName,
        driverNote: dist.driverNote,
        checkpointHistory: dist.checkpointHistory,
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
      initialDataState={sourceState}
      initialDataTimestamp={sourceTimestamp}
    />
  );
}
