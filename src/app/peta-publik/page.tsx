import { type MapPoint } from "@/components/crisis-map";
import { PublicMapShell } from "@/components/public-map-shell";
import { getBmkgEarthquakeAlert } from "@/lib/repositories/external-alerts";
import { getPublicMapData } from "@/lib/repositories/operations";

export const dynamic = "force-dynamic";

export default async function PublicMapPage() {
  const [{ disasterEvents, shelters }, bmkgEarthquake] = await Promise.all([
    getPublicMapData(),
    getBmkgEarthquakeAlert().catch(() => null),
  ]);
  const points: MapPoint[] = [
    ...disasterEvents.map((event) => ({
      id: event.id,
      name: event.name,
      location: `${event.location}, ${event.province}`,
      latitude: event.coordinates.latitude,
      longitude: event.coordinates.longitude,
      status: event.status,
      kind: "Kejadian" as const,
      detail: event.summary,
    })),
    ...shelters.map((shelter) => ({
      id: shelter.id,
      name: shelter.name,
      location: shelter.location,
      latitude: shelter.coordinates.latitude,
      longitude: shelter.coordinates.longitude,
      status: shelter.status,
      kind: "Posko" as const,
      detail: "Informasi posko publik tersedia tanpa data pribadi.",
    })),
    ...(bmkgEarthquake
      ? [{
          id: bmkgEarthquake.id,
          name: bmkgEarthquake.name,
          location: bmkgEarthquake.location,
          latitude: bmkgEarthquake.latitude,
          longitude: bmkgEarthquake.longitude,
          status: bmkgEarthquake.status,
          kind: bmkgEarthquake.kind,
          detail: bmkgEarthquake.detail,
          updatedAt: bmkgEarthquake.updatedAt,
          source: bmkgEarthquake.source,
          sourceUrl: bmkgEarthquake.sourceUrl,
        }]
      : []),
  ];

  return (
    <PublicMapShell
      disasterEvents={disasterEvents}
      shelters={shelters}
      points={points}
      externalSources={[
        ...(bmkgEarthquake ? ["BMKG"] : []),
        "Open-Meteo",
        "data hujan",
      ]}
    />
  );
}
