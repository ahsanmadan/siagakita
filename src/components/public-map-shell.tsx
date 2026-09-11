"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { type CurrentProfile, roleLabel } from "@/lib/auth-types";
import { cn, getInitials, getPointTimestamp } from "@/lib/utils";
import type { DisasterEvent, Shelter } from "@/lib/types";
import { CitizenReportDialog } from "@/components/citizen-report-dialog";
import { PublicMapStatus } from "@/components/public-map-status";
import { useLiveAlerts } from "@/hooks/use-live-alerts";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

type PublicMapShellProps = {
  disasterEvents: DisasterEvent[];
  shelters: Shelter[];
  points: MapPoint[];
  externalSources?: string[];
  initialPointId?: string;
  currentUser?: CurrentProfile | null;
  initialTickerSummaries?: string[];
  initialDataState?: "live" | "cache" | "unavailable";
  initialDataTimestamp?: number | null;
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
  if (point.kind === "Distribution") {
    return layers.logisticsFleet;
  }
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
  initialDataState = "live",
  initialDataTimestamp,
}: PublicMapShellProps) {
  // Live alerts hook for zero-reload client synchronization of BMKG and PVMBG data
  const initialExternalPoints = useMemo(
    () => points.filter((p) => p.kind === "Gempa" || p.kind === "Gunung Api"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const {
    externalPoints: liveExternalPoints,
    isLiveSyncing,
    lastSyncTime,
    syncError,
    networkStatus,
    dataAge,
    hasCachedData,
    isUsingCachedData,
    useLastSnapshot,
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
  const [sessionExpired, setSessionExpired] = useState(false);

  const toggleLayer = useCallback((key: keyof MapLayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  const [mobileSnap, setMobileSnap] = useState<MobileSnap>(hasInitialPoint ? "compact" : "peek");
  const [mobileView, setMobileView] = useState<"list" | "detail">(hasInitialPoint ? "detail" : "list");
  const [isDragging, setIsDragging] = useState(false);
  const [dragCurrentDelta, setDragCurrentDelta] = useState(0);

  const recoverMissingPoint = useCallback(() => {
    setQuery("");
    setFilter("all");
    setSelectedPointId(undefined);
    setDetailHistory([]);
    setMobileView("list");
    setMobileSnap("peek");
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const supabase = createSupabaseBrowserClient();
    let active = true;

    void (async () => {
      const result = await supabase.auth.getSession();
      if (active && !result.data.session) setSessionExpired(true);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (active) setSessionExpired(!session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [currentUser]);

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
  const selectedPointUnavailable = Boolean(selectedPointId && !selectedPoint);

  const syncStatus = useMemo(() => {
    const syncedAt = lastSyncTime?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    if (networkStatus === "offline") {
      return (
        <PublicMapStatus
          compact
          tone="warning"
          title="Koneksi terputus"
          description="Peta menampilkan data yang sudah tersedia. Sambungkan internet untuk menerima pembaruan."
          actionLabel="Coba lagi"
          onAction={refreshNow}
          secondaryActionLabel={hasCachedData ? "Gunakan data terakhir" : undefined}
          onSecondaryAction={hasCachedData ? useLastSnapshot : undefined}
        />
      );
    }
    if (syncError) {
      return (
        <PublicMapStatus
          compact
          tone={liveExternalPoints.length ? "warning" : "critical"}
          title="Pembaruan data gagal"
          description={liveExternalPoints.length
            ? "Data di peta tetap dapat dibaca, tetapi informasi BMKG dan PVMBG mungkin belum terbaru."
            : "Server pemantauan belum dapat dihubungi. Data bencana eksternal belum tersedia."}
          actionLabel="Coba lagi"
          onAction={refreshNow}
          secondaryActionLabel={hasCachedData ? "Gunakan data terakhir" : undefined}
          onSecondaryAction={hasCachedData ? useLastSnapshot : undefined}
        />
      );
    }
    if (isLiveSyncing) {
      return <PublicMapStatus compact tone="info" title="Memperbarui data" description="Mengambil informasi terbaru dari BMKG dan PVMBG." loading />;
    }
    if (isUsingCachedData) {
      return (
        <PublicMapStatus
          compact
          tone={dataAge === "expired" ? "critical" : "warning"}
          title={dataAge === "expired" ? "Data terakhir sudah kedaluwarsa" : "Menggunakan data terakhir"}
          description={`Snapshot browser dari ${syncedAt ?? "sinkronisasi sebelumnya"} sedang ditampilkan. Verifikasi arahan resmi sebelum bertindak.`}
          actionLabel="Perbarui sekarang"
          onAction={refreshNow}
        />
      );
    }
    if (lastSyncTime && dataAge !== "fresh") {
      return (
        <PublicMapStatus
          compact
          tone={dataAge === "expired" ? "critical" : "warning"}
          title={dataAge === "expired" ? "Data belum diperbarui lebih dari 30 menit" : "Data mulai lama"}
          description={`Sinkronisasi terakhir pukul ${syncedAt}. Informasi terbaru mungkin belum masuk.`}
          actionLabel="Perbarui sekarang"
          onAction={refreshNow}
        />
      );
    }
    if (networkStatus === "slow") {
      return <PublicMapStatus compact tone="warning" title="Koneksi lambat" description="Pembaruan dapat memerlukan waktu lebih lama. Data yang sudah tampil tetap dapat digunakan." />;
    }
    return null;
  }, [dataAge, hasCachedData, isLiveSyncing, isUsingCachedData, lastSyncTime, liveExternalPoints.length, networkStatus, refreshNow, syncError, useLastSnapshot]);

  const serverStatus = initialDataState === "live" ? null : (
    <PublicMapStatus
      compact
      tone={initialDataState === "unavailable" && allPoints.length === 0 ? "critical" : "warning"}
      title={initialDataState === "cache" ? "Menggunakan data operasional terakhir" : "Data posko dan kejadian belum tersedia"}
      description={initialDataState === "cache"
        ? `Server database tidak dapat dijangkau. Data operasional dari ${initialDataTimestamp ? new Date(initialDataTimestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "sinkronisasi sebelumnya"} tetap ditampilkan.`
        : "Server database belum dapat dihubungi. Informasi BMKG dan PVMBG yang tersedia tetap ditampilkan."}
      actionLabel="Muat ulang"
      onAction={() => window.location.reload()}
    />
  );

  const sidebarStatus = selectedPointUnavailable ? (
    <>
      {serverStatus}
      {syncStatus}
      <PublicMapStatus
        compact
        tone="warning"
        title="Detail lokasi tidak tersedia"
        description="Marker yang dipilih tidak ditemukan pada data terbaru. Kembali ke daftar untuk memilih lokasi lain."
        actionLabel="Kembali ke daftar"
        onAction={recoverMissingPoint}
      />
    </>
  ) : serverStatus || syncStatus ? <>{serverStatus}{syncStatus}</> : null;

  const sidebarPoints = useMemo(() => {
    const kindPriority: Record<MapPoint["kind"], number> = {
      Kejadian: 1,
      Posko: 2,
      "Critical Need": 3,
      Distribution: 4,
      "Gunung Api": 5,
      Gempa: 6,
    };

    return filteredPoints.filter((point) => point.kind !== "Posko").sort((a, b) => {
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
                points={allPoints}
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
                currentUser={sessionExpired ? null : currentUser}
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
            currentUser={sessionExpired ? null : currentUser}
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
            points={allPoints}
            meta={pointMeta.get(selectedPoint.id)}
            onClose={closeDetail}
            onSelectPoint={selectPoint}
          />
        </section>
      ) : null}

      {/* Citizen Emergency Reporting Button & Staff Controls */}
      {sessionExpired ? (
        <PublicMapStatus
          compact
          className="public-map-session-status"
          tone="critical"
          title="Sesi petugas telah berakhir"
          description="Masuk kembali untuk membuka Console Operasi. Peta publik tetap dapat digunakan."
          actionLabel="Masuk kembali"
          onAction={() => window.location.assign("/login?reason=session-expired")}
        />
      ) : null}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative flex size-9 items-center justify-center rounded-full border border-border bg-card shadow-xs transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                  aria-label="Menu profil petugas"
                  title={`Akun: ${currentUser.fullName}`}
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
                    {currentUser.fullName.trim().toLowerCase() !== roleLabel(currentUser.role).trim().toLowerCase() ? (
                      <div className="pt-1.5">
                        <span className="inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {roleLabel(currentUser.role)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                   <Link href={sessionExpired ? "/login?reason=session-expired" : "/dashboard"} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
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
