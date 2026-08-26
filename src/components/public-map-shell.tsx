"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  CloudRain,
  Layers,
  ListTree,
  LocateFixed,
  LogIn,
  MapIcon,
  Menu,
  Search,
  ShieldCheck,
  TentTree,
  TriangleAlert,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { CrisisMap, type MapPoint } from "@/components/crisis-map";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { DisasterEvent, Shelter } from "@/lib/types";

type PublicFilter = "all" | "events" | "shelters" | "safe";
type PublicStatusFilter = "all" | "critical" | "major" | "safe";

type PublicMapShellProps = {
  disasterEvents: DisasterEvent[];
  shelters: Shelter[];
  points: MapPoint[];
  externalSources?: string[];
};

const statusFilterLabels: Record<PublicStatusFilter, string> = {
  all: "Semua status",
  critical: "Kritis",
  major: "Waspada",
  safe: "Aman",
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function pointMatchesQuery(point: MapPoint, query: string) {
  const keyword = normalize(query);
  if (!keyword) return true;
  return [point.name, point.location, point.kind, point.status, point.detail]
    .some((value) => normalize(value).includes(keyword));
}

function pointMatchesFilter(point: MapPoint, filter: PublicFilter) {
  if (filter === "events") return point.kind === "Kejadian" || point.kind === "Gempa";
  if (filter === "shelters") return point.kind === "Posko";
  if (filter === "safe") return point.status === "safe";
  return true;
}

function pointMatchesStatusFilter(point: MapPoint, statusFilter: PublicStatusFilter) {
  const status = normalize(point.status);
  if (statusFilter === "critical") return status === "critical" || status === "kritis";
  if (statusFilter === "major") return status === "major" || status === "warning" || status === "waspada";
  if (statusFilter === "safe") return status === "safe" || status === "aman";
  return true;
}

type WeatherState =
  | { status: "idle" | "loading" | "error" }
  | {
      status: "ready";
      source: string;
      sourceUrl: string;
      label: string;
      temperature?: number;
      humidity?: number;
      precipitation?: number;
      rain?: number;
      windSpeed?: number;
      units: Record<string, string>;
    };

function PublicWeatherCard({ point }: { point: MapPoint | undefined }) {
  const [weather, setWeather] = useState<WeatherState>({ status: "idle" });

  useEffect(() => {
    if (!point) return;

    const controller = new AbortController();

    fetch(`/api/public/weather?lat=${point.latitude}&lon=${point.longitude}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.ok) {
          setWeather({ status: "error" });
          return;
        }

        setWeather({
          status: "ready",
          source: payload.source,
          sourceUrl: payload.sourceUrl,
          label: payload.label,
          temperature: payload.temperature,
          humidity: payload.humidity,
          precipitation: payload.precipitation,
          rain: payload.rain,
          windSpeed: payload.windSpeed,
          units: payload.units ?? {},
        });
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setWeather({ status: "error" });
      });

    return () => controller.abort();
  }, [point]);

  if (!point || weather.status === "error" || weather.status === "idle") return null;

  return (
    <div className="mt-3 rounded-2xl border border-border/70 bg-muted/50 p-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Cuaca sekitar titik</p>
          <p className="mt-1 truncate text-sm font-semibold">{weather.status === "ready" ? weather.label : "Memuat cuaca..."}</p>
        </div>
        <CloudRain className="size-4 shrink-0 text-[var(--color-brand)]" />
      </div>
      {weather.status === "ready" ? (
        <>
          <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="data-number text-base font-semibold">{weather.temperature ?? "-"}{weather.units.temperature_2m ?? "°C"}</p>
              <p className="text-muted-foreground">Suhu</p>
            </div>
            <div>
              <p className="data-number text-base font-semibold">{weather.rain ?? weather.precipitation ?? 0}{weather.units.rain ?? "mm"}</p>
              <p className="text-muted-foreground">Hujan</p>
            </div>
            <div>
              <p className="data-number text-base font-semibold">{weather.windSpeed ?? "-"} {weather.units.wind_speed_10m ?? "km/j"}</p>
              <p className="text-muted-foreground">Angin</p>
            </div>
          </div>
          <p className="mt-2.5 text-[0.7rem] leading-4 text-muted-foreground">
            Sumber pendukung: <a className="underline underline-offset-2" href={weather.sourceUrl} target="_blank" rel="noreferrer">{weather.source}</a>.
          </p>
        </>
      ) : null}
    </div>
  );
}

export function PublicMapShell({ disasterEvents, shelters, points, externalSources = [] }: PublicMapShellProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PublicFilter>("all");
  const [statusFilter, setStatusFilter] = useState<PublicStatusFilter>("all");
  const [rainRadarEnabled, setRainRadarEnabled] = useState(false);
  const [selectedPointId, setSelectedPointId] = useState<string | undefined>(points[0]?.id);

  const pointMeta = useMemo(() => {
    const entries = [
      ...disasterEvents.map((event) => [event.id, { updatedAt: event.updatedAt, summary: event.summary }] as const),
      ...shelters.map((shelter) => [shelter.id, { updatedAt: shelter.lastUpdate, summary: "Informasi posko publik tersedia tanpa data pribadi." }] as const),
      ...points.filter((point) => point.kind === "Gempa").map((point) => [point.id, { updatedAt: point.updatedAt ?? "berkala", summary: point.detail }] as const),
    ];
    return new Map(entries);
  }, [disasterEvents, points, shelters]);
  const fitBoundsPadding = useMemo(() => ({ top: 104, right: 96, bottom: 132, left: 420 }), []);

  const filteredPoints = useMemo(
    () => points.filter((point) => pointMatchesFilter(point, filter) && pointMatchesStatusFilter(point, statusFilter) && pointMatchesQuery(point, query)),
    [filter, points, query, statusFilter],
  );

  const selectedPoint = useMemo(
    () => filteredPoints.find((point) => point.id === selectedPointId) ?? filteredPoints[0] ?? points[0],
    [filteredPoints, points, selectedPointId],
  );

  const activeEvents = points.filter((point) => point.kind === "Kejadian" || point.kind === "Gempa").length;
  const visibleShelters = shelters.length;

  const selectPoint = useCallback((point: MapPoint) => {
    setSelectedPointId(point.id);
  }, []);

  const setFilterAndSelect = (nextFilter: PublicFilter) => {
    setFilter(nextFilter);
    const firstMatch = points.find((point) => pointMatchesFilter(point, nextFilter) && pointMatchesStatusFilter(point, statusFilter) && pointMatchesQuery(point, query));
    setSelectedPointId(firstMatch?.id);
  };

  const setStatusFilterAndSelect = (nextStatusFilter: PublicStatusFilter) => {
    setStatusFilter(nextStatusFilter);
    const firstMatch = points.find((point) => pointMatchesFilter(point, filter) && pointMatchesStatusFilter(point, nextStatusFilter) && pointMatchesQuery(point, query));
    setSelectedPointId(firstMatch?.id);
  };

  const statusFilterItems: { id: PublicStatusFilter; icon: typeof ShieldCheck; count: number }[] = [
    { id: "all", icon: ShieldCheck, count: points.filter((point) => pointMatchesFilter(point, filter)).length },
    { id: "critical", icon: TriangleAlert, count: points.filter((point) => pointMatchesFilter(point, filter) && pointMatchesStatusFilter(point, "critical")).length },
    { id: "major", icon: BellRing, count: points.filter((point) => pointMatchesFilter(point, filter) && pointMatchesStatusFilter(point, "major")).length },
    { id: "safe", icon: LocateFixed, count: points.filter((point) => pointMatchesFilter(point, filter) && pointMatchesStatusFilter(point, "safe")).length },
  ];

  return (
    <main className="public-map-shell relative min-h-svh overflow-hidden bg-background">
      <div className="absolute inset-0">
        <CrisisMap
          points={filteredPoints}
          publicMode
          selectedPointId={selectedPoint?.id}
          onPointSelect={selectPoint}
          controlPosition="bottom-right"
          fitBoundsPadding={fitBoundsPadding}
          rainRadarEnabled={rainRadarEnabled}
          className="h-full min-h-svh rounded-none border-0"
        />
      </div>

      <aside className="public-map-rail absolute inset-y-0 left-0 z-30 hidden w-[4.5rem] flex-col items-center gap-2.5 border-r border-white/70 bg-white/86 px-2 py-3 shadow-[0_16px_44px_rgb(24_78_119_/_9%)] backdrop-blur-xl lg:flex">
        <Button variant="ghost" size="icon" className="size-10 rounded-full border border-border/65 bg-[var(--color-ink)] text-white shadow-sm hover:bg-[var(--color-brand)] hover:text-white" aria-label="Buka menu peta publik">
          <Menu className="size-5" />
        </Button>
        <Separator className="my-1 w-9" />
        {[
          { label: "Ringkasan", icon: ListTree, filter: "all" as PublicFilter },
          { label: "Kejadian", icon: BellRing, filter: "events" as PublicFilter },
          { label: "Posko", icon: TentTree, filter: "shelters" as PublicFilter },
          { label: "Lapisan", icon: Layers, filter: "safe" as PublicFilter },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            className={cn("public-map-rail-item", filter === item.filter && "is-active")}
            onClick={() => setFilterAndSelect(item.filter)}
          >
            <span className="public-map-rail-icon">
              <item.icon className="size-5" />
            </span>
            <span className="public-map-rail-label">{item.label}</span>
          </button>
        ))}
        <div className="mt-auto">
          <Button asChild variant="outline" size="icon" className="size-10 rounded-full bg-white/88 shadow-sm" aria-label="Masuk petugas">
            <Link href="/login"><LogIn className="size-5" /></Link>
          </Button>
        </div>
      </aside>

      <section className="pointer-events-none absolute inset-x-0 top-0 z-40 px-3 py-3 sm:px-5 lg:left-[4.5rem] lg:px-5">
        <div className="pointer-events-auto flex max-w-[65rem] flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="hidden rounded-[1.15rem] border border-white/80 bg-white/94 px-3.5 py-2.5 shadow-[0_12px_30px_rgb(24_78_119_/_11%)] backdrop-blur-xl sm:block">
              <BrandMark compact className="h-7 w-30" />
            </div>
            <div className="flex min-h-13 flex-1 items-center gap-2 rounded-[1.15rem] border border-white/82 bg-white/95 px-3 shadow-[0_12px_30px_rgb(24_78_119_/_11%)] backdrop-blur-xl md:max-w-[39rem]">
              <Search className="size-5 shrink-0 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedPointId(undefined);
                }}
                placeholder="Cari posko, kejadian, atau wilayah"
                className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                aria-label="Cari kejadian, posko, atau wilayah"
              />
              {query ? (
                <Button type="button" variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => setQuery("")} aria-label="Bersihkan pencarian">
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
            <Button asChild className="hidden min-h-12 rounded-[1.05rem] bg-[var(--color-brand)] px-5 shadow-[0_12px_28px_rgb(24_78_119_/_18%)] hover:bg-[color-mix(in_oklch,var(--color-brand)_88%,black)] sm:inline-flex">
              <Link href="/login"><LogIn className="size-4" /> Masuk petugas</Link>
            </Button>
          </div>

          <div className="flex max-w-[56rem] gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {statusFilterItems.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant={statusFilter === item.id ? "default" : "outline"}
                className={cn(
                  "h-10 shrink-0 rounded-full border-white/80 bg-white/93 px-3.5 text-sm shadow-[0_8px_18px_rgb(24_78_119_/_9%)] backdrop-blur-xl",
                  statusFilter === item.id && "bg-[var(--color-ink)] text-white hover:bg-[var(--color-ink)]",
                )}
                onClick={() => setStatusFilterAndSelect(item.id)}
              >
                <item.icon className="size-4" />
                {statusFilterLabels[item.id]}
                <span className={cn("ml-1 rounded-full px-2 py-0.5 text-xs", statusFilter === item.id ? "bg-white/16 text-white" : "bg-muted text-muted-foreground")}>{item.count}</span>
              </Button>
            ))}
            <Button
              type="button"
              variant={rainRadarEnabled ? "default" : "outline"}
              className={cn(
                "h-10 shrink-0 rounded-full border-white/80 bg-white/93 px-3.5 text-sm shadow-[0_8px_18px_rgb(24_78_119_/_9%)] backdrop-blur-xl",
                rainRadarEnabled && "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand)]",
              )}
              onClick={() => setRainRadarEnabled((value) => !value)}
            >
              <CloudRain className="size-4" />
              Pantau hujan
            </Button>
          </div>
        </div>
      </section>

      <section className="pointer-events-none absolute bottom-3 left-3 right-3 z-40 lg:bottom-auto lg:left-[5.5rem] lg:right-auto lg:top-[8.25rem] lg:w-[23.5rem]">
        <div className="pointer-events-auto max-h-[52svh] overflow-hidden rounded-[1.35rem] border border-white/82 bg-white/96 shadow-[0_22px_54px_rgb(24_78_119_/_16%)] backdrop-blur-xl lg:max-h-[calc(100svh-8.25rem)]">
          <div className="border-b border-border/65 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Informasi warga</p>
                <h1 className="mt-1 text-lg font-semibold tracking-tight">Cari bantuan terdekat</h1>
                <Badge variant="secondary" className="mt-2 rounded-full bg-[var(--color-teal-soft)] px-2.5 text-[0.7rem] text-[var(--color-ink)]">
                  <ShieldCheck className="size-3" /> Aman dibagikan
                </Badge>
              </div>
              <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand)] text-white shadow-sm">
                <MapIcon className="size-[1.125rem]" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-2xl border border-border/65 bg-muted/45 text-xs">
              <div className="px-3 py-2.5">
                <p className="data-number text-base font-semibold">{activeEvents}</p>
                <p className="text-muted-foreground">Kejadian</p>
              </div>
              <div className="border-x border-border/65 px-3 py-2.5">
                <p className="data-number text-base font-semibold">{visibleShelters}</p>
                <p className="text-muted-foreground">Posko</p>
              </div>
              <div className="px-3 py-2.5">
                <p className="data-number text-base font-semibold">{filteredPoints.length}</p>
                <p className="text-muted-foreground">Tampil</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                className="h-9 rounded-full bg-[var(--color-brand)] px-3 text-xs font-semibold shadow-sm hover:bg-[color-mix(in_oklch,var(--color-brand)_88%,black)]"
                onClick={() => setFilterAndSelect("shelters")}
                disabled={!visibleShelters}
              >
                Cari posko terdekat
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full border-border/70 bg-white px-3 text-xs font-semibold"
                onClick={() => setFilterAndSelect("events")}
                disabled={!activeEvents}
              >
                Lihat kejadian aktif
              </Button>
            </div>
          </div>

          {selectedPoint ? (
            <article className="p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground">{selectedPoint.kind}</p>
                  <h2 className="mt-1 text-[1.05rem] font-semibold leading-snug">{selectedPoint.name}</h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{selectedPoint.location}</p>
              {selectedPoint.kind === "Gempa" ? (
                <p className="mt-2 text-xs font-medium text-[var(--color-critical-deep)]">
                  Sumber resmi: {selectedPoint.sourceUrl ? <a className="underline underline-offset-2" href={selectedPoint.sourceUrl} target="_blank" rel="noreferrer">{selectedPoint.source ?? "BMKG"}</a> : selectedPoint.source ?? "BMKG"}
                </p>
              ) : null}
            </div>
            <StatusBadge status={selectedPoint.status} />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {pointMeta.get(selectedPoint.id)?.summary ?? selectedPoint.detail}
          </p>
          <PublicWeatherCard point={selectedPoint} />
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border/55 bg-muted/45 px-3 py-2.5 text-xs text-muted-foreground">
            <span>Diperbarui {pointMeta.get(selectedPoint.id)?.updatedAt ?? "berkala"}</span>
              <Button type="button" variant="ghost" className="h-8 rounded-full px-2.5 text-xs font-semibold" onClick={() => setFilterAndSelect(selectedPoint.kind === "Posko" ? "shelters" : "events")}>
                {selectedPoint.kind === "Posko" ? "Lihat posko" : "Lihat kejadian"}
              </Button>
              </div>
            </article>
          ) : (
            <div className="space-y-3 p-3.5 text-sm text-muted-foreground">
              <p>Tidak ada titik publik yang cocok dengan filter saat ini.</p>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                  setFilter("all");
                  setSelectedPointId(points[0]?.id);
                }}
              >
                Tampilkan semua info
              </Button>
            </div>
          )}

          <div className="hidden border-t border-border/70 lg:block">
            <div className="flex items-center justify-between gap-3 border-b border-border/65 px-3.5 py-2.5">
              <div>
                <p className="text-xs font-semibold">Pantau hujan</p>
                <p className="text-[0.7rem] text-muted-foreground">Perkiraan hujan</p>
              </div>
              <Button
                type="button"
                variant={rainRadarEnabled ? "default" : "outline"}
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => setRainRadarEnabled((value) => !value)}
              >
                <CloudRain className="size-3.5" />
                {rainRadarEnabled ? "Aktif" : "Tampilkan"}
              </Button>
            </div>
            <ScrollArea className="h-[12.5rem]">
              <div className="p-2">
                {filteredPoints.map((point) => (
                  <button
                    key={point.id}
                    type="button"
                    className={cn("w-full border-b border-border/55 px-2.5 py-2.5 text-left transition last:border-b-0 hover:bg-muted/55", selectedPoint?.id === point.id && "rounded-xl border-b-transparent bg-primary/8")}
                    onClick={() => selectPoint(point)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{point.name}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{point.location}</p>
                      </div>
                      <StatusBadge status={point.status} className="shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
            {externalSources.length ? (
              <div className="truncate border-t border-border/70 px-3.5 py-2.5 text-[0.7rem] text-muted-foreground">
                Sumber data pendukung: {externalSources.join(", ")}.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
