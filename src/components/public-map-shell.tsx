"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { CrisisMap, type MapPoint } from "@/components/crisis-map";
import {
  DisasterDetailPanel,
  DisasterFilter,
  DisasterSearch,
  DisasterSidebar,
  type PublicFilter,
  type PublicPointMeta,
} from "@/components/disaster-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DisasterEvent, Shelter } from "@/lib/types";

type PublicMapShellProps = {
  disasterEvents: DisasterEvent[];
  shelters: Shelter[];
  points: MapPoint[];
  externalSources?: string[];
};

export type MobileSnap = "peek" | "compact" | "expanded";

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function isEventPoint(point: MapPoint) {
  return point.kind === "Kejadian" || point.kind === "Gempa";
}

function publicSummaryForPoint(point: MapPoint, summary?: string) {
  if (point.kind === "Gempa") {
    const area = point.location.includes(",")
      ? point.location.split(",").at(-1)?.trim()
      : "wilayah sekitar pusat gempa";
    return `Gempa terasa di ${area ?? "wilayah sekitar pusat gempa"}. Ikuti info BMKG dan arahan petugas.`;
  }

  return summary ?? point.detail;
}

function publicImageForEvent(event: DisasterEvent): PublicPointMeta["image"] {
  const type = event.type.toLowerCase();

  if (type.includes("banjir")) {
    return {
      src: "/brand/login-slide-2.jpg",
      alt: `Foto referensi kondisi banjir untuk ${event.name}`,
      source: "Foto referensi",
    };
  }

  return {
    alt: `Foto kejadian ${event.name} belum tersedia`,
  };
}

function pointMatchesQuery(point: MapPoint, query: string) {
  const keyword = normalize(query);
  if (!keyword) return true;
  return [point.name, point.location, point.kind, point.status, point.detail]
    .some((value) => normalize(value).includes(keyword));
}

function pointMatchesFilter(point: MapPoint, filter: PublicFilter) {
  if (filter === "events") return isEventPoint(point);
  if (filter === "critical") return point.status === "critical" || point.kind === "Critical Need";
  if (filter === "safe") return point.status === "safe";
  return true;
}

export function PublicMapShell({
  disasterEvents,
  shelters,
  points,
  externalSources = [],
}: PublicMapShellProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PublicFilter>("all");
  const [resetViewSignal, setResetViewSignal] = useState(0);
  const [focusPointSignal, setFocusPointSignal] = useState(0);
  const [selectedPointId, setSelectedPointId] = useState<string | undefined>();
  const [detailHistory, setDetailHistory] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSnap, setMobileSnap] = useState<MobileSnap>("peek");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [isDragging, setIsDragging] = useState(false);
  const [dragCurrentDelta, setDragCurrentDelta] = useState(0);

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
        image: publicImageForEvent(event),
      }] as const),
      ...shelters.map((shelter) => {
        const urgentNeed = shelter.needs.find((need) => need.urgency === "critical");
        return [shelter.id, {
          updatedAt: shelter.lastUpdate,
          summary: shelter.population.total > 0 ? `${shelter.population.total} pengungsi` : "Info posko untuk warga",
          cue: urgentNeed ? `Butuh ${urgentNeed.item.toLowerCase()}` : `${shelter.population.total} pengungsi`,
          affectedPeople: shelter.population.total,
          image: {
            alt: `Foto posko ${shelter.name} belum tersedia`,
          },
        }] as const;
      }),
      ...points.filter((point) => point.kind === "Gempa").map((point) => [point.id, {
        updatedAt: point.updatedAt ?? "berkala",
        summary: publicSummaryForPoint(point),
        image: {
          alt: `Foto kejadian ${point.name} belum tersedia`,
        },
      }] as const),
    ];
    return new Map<string, PublicPointMeta>(entries);
  }, [disasterEvents, points, shelters]);

  const fitBoundsPadding = useMemo(() => ({ top: 104, right: 96, bottom: 132, left: 420 }), []);

  const filteredPoints = useMemo(
    () => points.filter((point) => pointMatchesFilter(point, filter) && pointMatchesQuery(point, query)),
    [filter, points, query],
  );

  const selectedPoint = useMemo(
    () => selectedPointId
      ? filteredPoints.find((point) => point.id === selectedPointId) ?? points.find((point) => point.id === selectedPointId)
      : undefined,
    [filteredPoints, points, selectedPointId],
  );

  const hasSearchQuery = Boolean(query.trim());
  const sidebarPoints = useMemo(
    () => hasSearchQuery ? filteredPoints : filteredPoints.filter((point) => point.kind !== "Posko"),
    [filteredPoints, hasSearchQuery],
  );


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
    >
      <div className="absolute inset-0">
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
        aria-label={sidebarOpen ? "Tutup panel peta" : "Buka panel peta"}
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
      >
        {/* Mobile ONLY drag handle */}
        <div
          className="public-map-sheet-handle lg:hidden pointer-events-auto"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          aria-label="Tarik untuk mengatur tinggi panel"
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

      <div
        className={cn(
          "public-map-staff-login-wrap pointer-events-none absolute right-3 top-3 z-50 max-lg:hidden sm:right-5",
          mobileSnap === "expanded" && "max-lg:hidden",
        )}
      >
        <Button
          asChild
          variant="outline"
          className="public-map-staff-login pointer-events-auto h-9 rounded-md px-4 text-[12px] font-medium shadow-none"
        >
          <Link href="/login" aria-label="Masuk petugas">Masuk</Link>
        </Button>
      </div>
    </main>
  );
}
