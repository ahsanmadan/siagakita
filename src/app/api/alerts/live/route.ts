import { NextResponse } from "next/server";
import { getComprehensiveLiveAlerts } from "@/lib/repositories/external-alerts";
import type { MapPoint } from "@/components/crisis-map";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const alerts = await getComprehensiveLiveAlerts();

    // Map external alerts into MapPoint format for MapLibre GL
    const quakePoints: MapPoint[] = alerts.earthquakes.map((q) => ({
      id: q.id,
      name: q.name,
      location: q.location,
      latitude: q.latitude,
      longitude: q.longitude,
      status: q.status,
      kind: "Gempa" as const,
      shakemapUrl: q.meta?.shakemapUrl,
      magnitude: q.meta?.magnitude,
      depth: q.meta?.depth,
      feltScale: q.meta?.feltScale,
      tsunamiPotential: q.meta?.tsunamiPotential,
      detail: q.detail,
      updatedAt: q.updatedAt,
      timestampMs: q.timestampMs,
      source: q.source,
      sourceUrl: q.sourceUrl,
    }));

    const volcanoPoints: MapPoint[] = alerts.volcanoes.map((v) => ({
      id: v.id,
      name: v.name,
      location: v.location,
      latitude: v.latitude,
      longitude: v.longitude,
      status: v.status,
      kind: "Gunung Api" as const,
      isErupting: v.isErupting,
      eruptionReport: v.eruptionReport,
      observationReport: v.observationReport,
      hasCctv: v.hasCctv,
      cctvCount: v.cctvCount,
      detail: v.detail,
      updatedAt: v.updatedAt,
      timestampMs: v.timestampMs,
      source: v.source,
      sourceUrl: v.sourceUrl,
    }));

    const mapPoints = [...quakePoints, ...volcanoPoints];

    return NextResponse.json(
      {
        ok: true,
        timestamp: new Date().toISOString(),
        sources: ["BMKG", "PVMBG/Magma Indonesia", "USGS (Failover)"],
        earthquakes: {
          autoGempa: alerts.latestEarthquake,
          recentCount: alerts.earthquakes.length,
          latest: alerts.latestEarthquake,
        },
        volcanoes: {
          totalMonitored: alerts.volcanoes.length,
          criticalCount: alerts.criticalVolcanoes.length,
          list: alerts.volcanoes,
        },
        latestEarthquake: alerts.latestEarthquake,
        earthquakesCount: alerts.earthquakes.length,
        volcanoesCount: alerts.volcanoes.length,
        criticalVolcanoesCount: alerts.criticalVolcanoes.length,
        tickerSummaries: alerts.tickerSummaries,
        mapPoints,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Gagal memuat telemetri bencana live.",
      },
      { status: 500 },
    );
  }
}
