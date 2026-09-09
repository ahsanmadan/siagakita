"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { CrisisMap, getVolcanoLevel, type MapPoint } from "@/components/crisis-map";
import {
  DisasterDetailPanel,
  DisasterFilter,
  DisasterSearch,
  DisasterSidebar,
  type PublicFilter,
  type PublicPointMeta,
} from "@/components/disaster-sidebar";
import { MapLayerControl, DEFAULT_MAP_LAYERS, type MapLayerState } from "@/components/map-layer-control";
import { Button } from "@/components/ui/button";
import { Marquee } from "@/components/ui/marquee";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, LogOut, Pause, Play, RefreshCw } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { type CurrentProfile, roleLabel } from "@/lib/auth-types";
import { cn, getInitials, getPointTimestamp } from "@/lib/utils";
import type { DisasterEvent, Shelter } from "@/lib/types";
import { CitizenReportDialog } from "@/components/citizen-report-dialog";
import { useLiveAlerts } from "@/hooks/use-live-alerts";

type PublicMapShellProps = {
  disasterEvents: DisasterEvent[];
  shelters: Shelter[];
  points: MapPoint[];
  externalSources?: string[];
  initialPointId?: string;
  currentUser?: CurrentProfile | null;
  initialTickerSummaries?: string[];
};

export type MobileSnap = "peek" | "compact" | "expanded";

function normalize(value?: string | null) {
  return (value ?? "").toLowerCase().trim();
}

function isEventPoint(point: MapPoint) {
  return point.kind === "Kejadian" || point.kind === "Gempa" || point.kind === "Gunung Api";
}

function publicSummaryForPoint(point: MapPoint, summary?: string) {
  if (point.kind === "Gempa") {
    const loc = point.location ?? "";
    const area = loc.includes(",")
      ? loc.split(",").at(-1)?.trim()
      : "wilayah sekitar pusat gempa";
    return `Gempa terasa di ${area || "wilayah sekitar pusat gempa"}. Ikuti info BMKG dan arahan petugas.`;
  }
  if (point.kind === "Gunung Api") {
    return point.detail || `Aktivitas vulkanik terpantau di ${point.name}. Jauhi radius bahaya rekomendasi PVMBG.`;
  }

  return summary ?? point.detail ?? "Informasi situasi darurat sedang diperbarui petugas.";
}

function publicImageForEvent(event?: DisasterEvent | null): PublicPointMeta["image"] {
  return {
    alt: `Foto kejadian ${event?.name ?? "bencana"} belum tersedia`,
  };
}

function pointMatchesQuery(point: MapPoint, query: string) {
  const keyword = normalize(query);
  if (!keyword) return true;
  return [point.name, point.location, point.kind, point.status, point.detail]
    .some((value) => normalize(value).includes(keyword));
}

function pointMatchesFilter(point: MapPoint, filter: PublicFilter) {
  if (filter === "shelters") return point.kind === "Posko" || point.kind === "Distribution";
  if (filter === "events") return isEventPoint(point);
  if (filter === "critical") return point.status === "critical" || point.kind === "Critical Need";
  if (filter === "safe") return point.status === "safe";
  return true;
}

function pointMatchesLayers(point: MapPoint, layers: MapLayerState) {
  if (point.kind === "Gempa") {
    return layers.earthquake;
  }
  if (point.kind === "Gunung Api") {
    const level = getVolcanoLevel(point);
    if (level === 4) return layers.volcanoLevel4;
    if (level === 3) return layers.volcanoLevel3;
    if (level === 2) return layers.volcanoLevel2;
    return layers.volcanoLevel1;
  }
  return true;
}

export function PublicMapShell({
  disasterEvents,
  shelters,
  points,
  externalSources = [],
  initialPointId,
  currentUser,
  initialTickerSummaries = [],
}: PublicMapShellProps) {
  // Live alerts hook for zero-reload client synchronization of BMKG and PVMBG data
  const initialExternalPoints = useMemo(
    () => points.filter((p) => p.kind === "Gempa" || p.kind === "Gunung Api"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const {
    externalPoints: liveExternalPoints,
    tickerSummaries: liveTickerSummaries,
    isLiveSyncing,
    refreshNow,
  } = useLiveAlerts({
    initialPoints: initialExternalPoints,
    initialTickerSummaries,
    pollIntervalMs: 30_000,
    enabled: true,
  });

  // Combine internal operational points with real-time live telemetries
  const allPoints = useMemo(() => {
    const internalPoints = points.filter((p) => p.kind !== "Gempa" && p.kind !== "Gunung Api");
    return [...internalPoints, ...liveExternalPoints];
  }, [points, liveExternalPoints]);

  const hasInitialPoint = Boolean(initialPointId && allPoints.some((point) => point.id === initialPointId));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PublicFilter>("all");
  const [resetViewSignal, setResetViewSignal] = useState(0);
  const [focusPointSignal, setFocusPointSignal] = useState(hasInitialPoint ? 1 : 0);
  const [selectedPointId, setSelectedPointId] = useState<string | undefined>(hasInitialPoint ? initialPointId : undefined);
  const [detailHistory, setDetailHistory] = useState<string[]>([]);
  const [layers, setLayers] = useState<MapLayerState>(DEFAULT_MAP_LAYERS);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleLayer = useCallback((key: keyof MapLayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  const [mobileSnap, setMobileSnap] = useState<MobileSnap>(hasInitialPoint ? "compact" : "peek");
  const [mobileView, setMobileView] = useState<"list" | "detail">(hasInitialPoint ? "detail" : "list");
  const [isDragging, setIsDragging] = useState(false);
  const [dragCurrentDelta, setDragCurrentDelta] = useState(0);
  const [isTickerPaused, setIsTickerPaused] = useState(false);

  const dragStartY = useRef<number | null>(null);
  const dragLastY = useRef<number | null>(null);
  const dragBaseTranslate = useRef(0);

  const pointMeta = useMemo(() => {
    const entries = [
      ...disasterEvents.map((event) => [event.id, {
        updatedAt: event.updatedAt,
        summary: event.summary,
        affectedPeople: event.affectedPeople,
        activeShelters: event.activeShelters,
        image: {
          src: "/images/disaster-cugenang.jpg",
          alt: `Foto lapangan penanganan ${event.name}`,
          source: "BPBD / Tim SAR",
        },
      }] as const),
      ...shelters.map((shelter) => {
        const needs = shelter.needs ?? [];
        const urgentNeed = needs.find((need) => need.urgency === "critical");
        const totalPopulation = shelter.population?.total ?? 0;
        return [shelter.id, {
          updatedAt: shelter.lastUpdate,
          summary: totalPopulation > 0 ? `${totalPopulation.toLocaleString("id-ID")} pengungsi` : "Info posko untuk warga",
          cue: urgentNeed ? `Butuh ${urgentNeed.item.toLowerCase()}` : (totalPopulation > 0 ? `${totalPopulation} pengungsi` : undefined),
          affectedPeople: totalPopulation,
          image: {
            src: "/images/shelter-camp.jpg",
            alt: `Foto posko ${shelter.name}`,
            source: "Posko Pengungsian",
          },
        }] as const;
      }),
      ...allPoints.filter((point) => point.kind === "Gunung Api").map((point) => {
        const hasEruptImg = Boolean(point.eruptionReport?.imageUrl);
        const hasCctv = Boolean(point.cctvList && point.cctvList.length > 0);
        const imgSrc = point.eruptionReport?.imageUrl || point.cctvList?.[0]?.imageUrl || "/images/volcano-merapi.jpg";
        const imgAlt = hasEruptImg
          ? `Dokumentasi visual letusan ${point.name}`
          : hasCctv
            ? `CCTV live pengamatan ${point.name}`
            : `Foto pengamatan aktivitas ${point.name}`;
        const imgSource = point.eruptionReport?.author
          ? `PVMBG (${point.eruptionReport.author})`
          : point.cctvList?.[0]?.locationName
            ? `CCTV Pos PGA (${point.cctvList[0].locationName})`
            : "Pusat Vulkanologi PVMBG";

        return [point.id, {
          updatedAt: point.updatedAt ?? "berkala",
          summary: publicSummaryForPoint(point),
          image: {
            src: imgSrc,
            alt: imgAlt,
            source: imgSource,
          },
        }] as const;
      }),
      ...allPoints.filter((point) => point.kind === "Gempa").map((point) => {
        const isFelt = point.status === "critical" || point.status === "major" || /dirasakan|merusak|tsunami|mmi/i.test(point.detail);
        const hasShakemap = Boolean(point.shakemapUrl);

        return [point.id, {
          updatedAt: point.updatedAt ?? "berkala",
          summary: publicSummaryForPoint(point),
          cue: point.depth ? `Kedlmn ${point.depth}` : (isFelt ? "Dirasakan" : undefined),
          image: hasShakemap ? {
            src: point.shakemapUrl!,
            alt: `Peta guncangan seismik ${point.name}`,
            source: "Peta Guncangan BMKG",
          } : undefined,
        }] as const;
      }),
    ];
    return new Map<string, PublicPointMeta>(entries);
  }, [disasterEvents, allPoints, shelters]);

  const fitBoundsPadding = useMemo(() => ({ top: 104, right: 96, bottom: 132, left: 420 }), []);

  const filteredPoints = useMemo(
    () =>
      allPoints.filter(
        (point) =>
          pointMatchesLayers(point, layers) &&
          pointMatchesFilter(point, filter) &&
          pointMatchesQuery(point, query),
      ),
    [allPoints, layers, filter, query],
  );

  const selectedPoint = useMemo(
    () => selectedPointId
      ? filteredPoints.find((point) => point.id === selectedPointId) ?? allPoints.find((point) => point.id === selectedPointId)
      : undefined,
    [filteredPoints, allPoints, selectedPointId],
  );

  const sidebarPoints = useMemo(() => {
    const kindPriority: Record<MapPoint["kind"], number> = {
      Kejadian: 1,
      Posko: 2,
      "Critical Need": 3,
      Distribution: 4,
      "Gunung Api": 5,
      Gempa: 6,
    };

    return [...filteredPoints].sort((a, b) => {
      const kindDiff = (kindPriority[a.kind] ?? 99) - (kindPriority[b.kind] ?? 99);
      if (kindDiff !== 0) return kindDiff;

      // Diurutkan berdasarkan waktu kejadian/pembaruan terbaru (bukan berdasarkan tag status)
      const timeDiff = getPointTimestamp(b) - getPointTimestamp(a);
      if (timeDiff !== 0) return timeDiff;

      return 0;
    });
  }, [filteredPoints]);


  const selectPoint = useCallback((point: MapPoint, options?: { preserveContext?: boolean }) => {
    setDetailHistory((history) => {
      if (!options?.preserveContext) return [];
      if (!selectedPointId || selectedPointId === point.id) return history;
      return [...history, selectedPointId];
    });

    setSidebarOpen(true);
    setSelectedPointId(point.id);
    setFocusPointSignal((value) => value + 1);
    setMobileView("detail");
    setMobileSnap("compact");
  }, [selectedPointId]);

  const resetMap = useCallback(() => {
    setQuery("");
    setFilter("all");
    setSelectedPointId(undefined);
    setDetailHistory([]);
    setResetViewSignal((value) => value + 1);
    setMobileView("list");
    setMobileSnap("peek");
  }, []);

  const updateQuery = useCallback((nextQuery: string) => {
    setQuery(nextQuery);
    setSelectedPointId(undefined);
    setDetailHistory([]);
    setMobileView("list");
    if (nextQuery.trim()) {
      setMobileSnap("compact");
    }
  }, []);

  const updateFilter = useCallback((nextFilter: PublicFilter) => {
    setFilter(nextFilter);
    setSelectedPointId(undefined);
    setDetailHistory([]);
  }, []);

  const closeDetail = useCallback(() => {
    const previousPointId = detailHistory.at(-1);
    if (previousPointId) {
      setDetailHistory((history) => history.slice(0, -1));
      setSelectedPointId(previousPointId);
      setFocusPointSignal((value) => value + 1);
      return;
    }

    setSelectedPointId(undefined);
    setDetailHistory([]);
    setMobileView("list");
    setMobileSnap("peek");
  }, [detailHistory]);

  const snapTranslateFor = useCallback((snap: MobileSnap, height: number) => {
    if (snap === "expanded") return 0;
    if (snap === "compact") return height * 0.58;
    return height * 0.85;
  }, []);

  const nearestSnapFor = useCallback((translate: number, height: number): MobileSnap => {
    const snaps: Array<{ snap: MobileSnap; translate: number }> = [
      { snap: "expanded", translate: 0 },
      { snap: "compact", translate: height * 0.58 },
      { snap: "peek", translate: height * 0.85 },
    ];

    return snaps.reduce((best, item) => (
      Math.abs(item.translate - translate) < Math.abs(best.translate - translate) ? item : best
    )).snap;
  }, []);

  const onHandlePointerDown = (e: React.PointerEvent) => {
    if (window.innerWidth >= 1024) return;
    dragStartY.current = e.clientY;
    dragLastY.current = e.clientY;
    dragBaseTranslate.current = snapTranslateFor(mobileSnap, window.innerHeight);
    setIsDragging(true);
    setDragCurrentDelta(0);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    dragLastY.current = e.clientY;

    const height = window.innerHeight;
    const rawTranslate = dragBaseTranslate.current + (e.clientY - dragStartY.current);
    const clampedTranslate = Math.min(height * 0.85, Math.max(0, rawTranslate));

    setDragCurrentDelta(clampedTranslate - dragBaseTranslate.current);
  };

  const onHandlePointerUp = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const height = window.innerHeight;
    const totalDelta = (dragLastY.current ?? e.clientY) - dragStartY.current;
    const finalTranslate = Math.min(height * 0.85, Math.max(0, dragBaseTranslate.current + totalDelta));

    dragStartY.current = null;
    dragLastY.current = null;
    setIsDragging(false);
    setDragCurrentDelta(0);

    if (Math.abs(totalDelta) < 8) {
      setMobileSnap((prev) => (prev === "peek" ? "compact" : prev === "compact" ? "expanded" : "compact"));
      return;
    }

    setMobileSnap(nearestSnapFor(finalTranslate, height));
  };

  const mobileTransformStyle = isDragging
    ? {
        transform: `translate3d(0, calc(var(--snap-base, 0px) + ${dragCurrentDelta}px), 0)`,
        transition: "none",
      }
    : undefined;

  const tickerItems = useMemo(() => {
    const items: string[] = [];

    // 1. Live BMKG & PVMBG alerts from hook
    if (liveTickerSummaries.length > 0) {
      items.push(...liveTickerSummaries);
    } else {
      const gempa = allPoints.find((p) => p.kind === "Gempa");
      if (gempa) {
        items.push(`📡 BMKG: ${gempa.name} (${gempa.location}). ${gempa.detail || "Waspada potensi gempa susulan."}`);
      }
      const volcano = allPoints.find((p) => p.kind === "Gunung Api" && (p.status === "critical" || p.status === "major"));
      if (volcano) {
        items.push(`🌋 PVMBG: ${volcano.name} (${volcano.location}) - ${volcano.detail}`);
      }
    }

    // 2. Incident events
    disasterEvents.forEach((evt) => {
      items.push(`🚨 ${evt.name} (${evt.location}): ${evt.summary}`);
    });

    // 3. Shelters
    shelters.forEach((sh) => {
      items.push(`⛺ Posko ${sh.name}: Melayani evakuasi dan koordinasi logistik di ${sh.location}.`);
    });

    if (items.length === 0) {
      items.push("✅ Kondisi Nasional Terpantau Aman: Tidak ada peringatan kedaruratan aktif saat ini.");
    }

    return items;
  }, [liveTickerSummaries, allPoints, disasterEvents, shelters]);

  return (
    <main
      className="public-map-shell relative min-h-svh overflow-hidden bg-background"
      data-panel-open={sidebarOpen ? "true" : "false"}
      data-detail-open={selectedPoint ? "true" : "false"}
      data-mobile-view={mobileView}
      data-mobile-snap={mobileSnap}
      suppressHydrationWarning
    >
      <div className="absolute inset-0" suppressHydrationWarning>
        <CrisisMap
          points={filteredPoints}
          publicMode
          selectedPointId={selectedPoint?.id}
          focusedPoint={selectedPoint}
          onPointSelect={selectPoint}
          controlPosition="bottom-right"
          fitBoundsPadding={fitBoundsPadding}
          resetViewSignal={resetViewSignal}
          focusPointSignal={focusPointSignal}
          className="h-full min-h-svh rounded-none border-0"
        />
      </div>

      {/* Floating Bottom-Left Layer Selector Control (dynamically aligns with sidebar) */}
      <MapLayerControl layers={layers} onLayerToggle={toggleLayer} />

      {/* Top Floating Emergency Marquee Ticker */}
      <aside
        aria-label="Peringatan Bencana Terkini"
        className={cn(
          "pointer-events-none absolute top-3 z-30 flex justify-center transition-[left,right] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "left-3 right-3",
          sidebarOpen
            ? "lg:left-[450px] xl:left-[490px] lg:right-32"
            : "lg:left-32 lg:right-32",
        )}
      >
        <div className="pointer-events-auto flex items-center gap-1.5 max-w-xl w-full h-8.5 px-3 rounded-full bg-card/90 dark:bg-card/95 backdrop-blur-md border border-border shadow-xs text-[11.5px] overflow-hidden" aria-live="polite">
          <div className="flex items-center shrink-0 pr-2 border-r border-border font-semibold text-red-600 dark:text-red-400 gap-1.5">
            <span className="tracking-wide text-[10px] uppercase font-bold">Siaga Terkini</span>
            <button
              type="button"
              onClick={() => setIsTickerPaused((prev) => !prev)}
              className="p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded cursor-pointer transition-colors"
              aria-label={isTickerPaused ? "Lanjutkan teks peringatan berjalan" : "Jeda teks peringatan berjalan"}
              title={isTickerPaused ? "Lanjutkan teks peringatan" : "Jeda teks peringatan"}
            >
              {isTickerPaused ? <Play className="size-2.5" /> : <Pause className="size-2.5" />}
            </button>
            <button
              type="button"
              onClick={() => refreshNow()}
              disabled={isLiveSyncing}
              className="p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded cursor-pointer transition-colors disabled:opacity-50"
              aria-label="Perbarui data telemetri bencana terkini"
              title="Sinkronkan BMKG & PVMBG sekarang"
            >
              <RefreshCw className={cn("size-2.5", isLiveSyncing && "animate-spin")} />
            </button>
          </div>
          <Marquee
            speed={50}
            className="py-0"
            paused={isTickerPaused}
          >
            <span className="text-foreground/85 font-medium inline-flex items-center gap-3">
              {tickerItems.map((item, index) => (
                <span key={index} className="inline-flex items-center gap-3">
                  <span>{item}</span>
                  <span className="text-border">·</span>
                </span>
              ))}
            </span>
          </Marquee>
        </div>
      </aside>

      <div className="public-map-mobile-controls pointer-events-none lg:hidden">
        <div className="public-map-mobile-search pointer-events-auto">
          <DisasterSearch query={query} onQueryChange={updateQuery} />
        </div>
        <div className="public-map-mobile-filter pointer-events-auto">
          <DisasterFilter filter={filter} onFilterChange={updateFilter} />
        </div>
      </div>

      {/* Desktop ONLY sidebar toggle button */}
      <button
        type="button"
        className="public-map-sidebar-toggle"
        aria-label={sidebarOpen ? "Tutup panel informasi bencana" : "Buka panel informasi bencana"}
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen((value) => !value)}
      >
        <span className="t-icon-swap" data-state={sidebarOpen ? "a" : "b"}>
          <span className="t-icon" data-icon="a"><ChevronLeftIcon className="size-4" /></span>
          <span className="t-icon" data-icon="b"><ChevronRightIcon className="size-4" /></span>
        </span>
      </button>

      {/* Single unified sheet — mobile swaps list/detail in one panel */}
      <section
        className="public-map-results-panel pointer-events-none absolute z-40"
        data-open={sidebarOpen ? "true" : "false"}
        data-snap={mobileSnap}
        data-dragging={isDragging ? "true" : "false"}
        data-mobile-view={mobileView}
        style={mobileTransformStyle}
        aria-label="Panel informasi bencana dan posko"
      >
        {/* Mobile ONLY drag handle */}
        <div
          role="button"
          tabIndex={0}
          className="public-map-sheet-handle lg:hidden pointer-events-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-grab active:cursor-grabbing"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMobileSnap((prev) => (prev === "peek" ? "compact" : prev === "compact" ? "expanded" : "peek"));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setMobileSnap((prev) => (prev === "peek" ? "compact" : "expanded"));
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setMobileSnap((prev) => (prev === "expanded" ? "compact" : "peek"));
            }
          }}
          aria-label={`Tinggi panel informasi ${mobileSnap === "peek" ? "minimal" : mobileSnap === "compact" ? "sedang" : "penuh"}. Tekan Spasi atau tombol Panah untuk atur.`}
          aria-expanded={mobileSnap === "expanded"}
        >
          <span className="public-map-sheet-pill" />
        </div>

        {/* Mobile: single panel, swap content */}
        <div className="lg:hidden flex flex-col flex-1 min-h-0">
          {mobileView === "detail" && selectedPoint ? (
            <div className="mobile-sheet-detail-view" key={selectedPoint.id}>
              <DisasterDetailPanel
                point={selectedPoint}
                points={points}
                meta={pointMeta.get(selectedPoint.id)}
                onClose={closeDetail}
                onSelectPoint={selectPoint}
              />
            </div>
          ) : (
            <div className="mobile-sheet-list-view">
              <DisasterSidebar
                filteredPoints={filteredPoints}
                sidebarPoints={sidebarPoints}
                selectedPointId={selectedPointId}
                query={query}
                filter={filter}
                externalSources={externalSources}
                pointMeta={pointMeta}
                currentUser={currentUser}
                onQueryChange={updateQuery}
                onFilterChange={updateFilter}
                onReset={resetMap}
                onSelectPoint={selectPoint}
              />
            </div>
          )}
        </div>

        {/* Desktop: sidebar list always rendered here */}
        <div className="hidden lg:flex flex-col flex-1 min-h-0">
          <DisasterSidebar
            filteredPoints={filteredPoints}
            sidebarPoints={sidebarPoints}
            selectedPointId={selectedPointId}
            query={query}
            filter={filter}
            externalSources={externalSources}
            pointMeta={pointMeta}
            currentUser={currentUser}
            onQueryChange={updateQuery}
            onFilterChange={updateFilter}
            onReset={resetMap}
            onSelectPoint={selectPoint}
          />
        </div>
      </section>

      {/* Desktop ONLY detail sub-sidebar */}
      {selectedPoint ? (
        <section
          className="disaster-detail-subsidebar pointer-events-none absolute z-40 max-lg:hidden"
          data-open={sidebarOpen ? "true" : "false"}
          aria-label={`Detail informasi ${selectedPoint.name}`}
        >
          <DisasterDetailPanel
            point={selectedPoint}
            points={points}
            meta={pointMeta.get(selectedPoint.id)}
            onClose={closeDetail}
            onSelectPoint={selectPoint}
          />
        </section>
      ) : null}

      {/* Citizen Emergency Reporting Button & Staff Controls */}
      <div
        className={cn(
          "public-map-staff-login-wrap pointer-events-none absolute right-3 top-3 z-50 flex items-center gap-2 sm:right-5",
          mobileSnap === "expanded" && "max-lg:hidden",
        )}
      >
        <div className="pointer-events-auto">
          <CitizenReportDialog />
        </div>

        {currentUser ? (
          <div className="pointer-events-auto flex items-center gap-2 max-lg:hidden">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-full px-3 text-[12px] font-medium shadow-xs hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Link href="/dashboard">
                <LayoutDashboard className="size-3.5" />
                <span>Console</span>
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative flex size-9 items-center justify-center rounded-full border border-border bg-card shadow-xs transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                  aria-label="Menu profil petugas"
                >
                  <Avatar className="size-8.5 rounded-full">
                    <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
                      {getInitials(currentUser.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-lg">
                <DropdownMenuLabel className="font-normal p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-semibold leading-none text-foreground">{currentUser.fullName}</p>
                    <p className="text-[11px] leading-none text-muted-foreground">{currentUser.email}</p>
                    <div className="pt-1.5">
                      <span className="inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {roleLabel(currentUser.role)}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <LayoutDashboard className="size-3.5 text-muted-foreground" />
                    <span>Dashboard Console</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={signOutAction} className="w-full">
                  <DropdownMenuItem asChild>
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2 text-xs font-medium text-destructive cursor-pointer focus:text-destructive"
                    >
                      <LogOut className="size-3.5" />
                      <span>Keluar Akun</span>
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="max-lg:hidden">
            <Button
              asChild
              variant="outline"
              className="public-map-staff-login pointer-events-auto h-9 rounded-md px-3.5 text-[12px] font-medium shadow-none hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Link href="/login" aria-label="Portal masuk petugas operasional">
                Portal Petugas
              </Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
