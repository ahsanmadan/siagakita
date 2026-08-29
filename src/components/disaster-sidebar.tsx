"use client";

import { ClearInput } from "@/components/ui/clear-input";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  CheckCircledIcon,
  GlobeIcon,
  BellIcon,
  CheckIcon,
  ChevronDownIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  PaperPlaneIcon,
  Share1Icon,
  TargetIcon,
} from "@radix-ui/react-icons";
import type { MapPoint } from "@/components/crisis-map";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type PublicFilter = "all" | "events" | "critical" | "safe";

export type PublicPointMeta = {
  updatedAt?: string;
  summary: string;
  cue?: string;
  affectedPeople?: number;
  activeShelters?: number;
  image?: {
    src?: string;
    alt: string;
    source?: string;
  };
};

type DisasterSidebarProps = {
  filteredPoints: MapPoint[];
  sidebarPoints: MapPoint[];
  selectedPointId?: string;
  query: string;
  filter: PublicFilter;
  externalSources: string[];
  pointMeta: Map<string, PublicPointMeta>;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: PublicFilter) => void;
  onReset: () => void;
  onSelectPoint: (point: MapPoint) => void;
};

type DisasterDetailPanelProps = {
  point: MapPoint;
  points: MapPoint[];
  meta?: PublicPointMeta;
  onClose: () => void;
  onSelectPoint: (point: MapPoint, options?: { preserveContext?: boolean }) => void;
};

const filterLabels: Record<PublicFilter, string> = {
  all: "Semua Info",
  events: "Ada Bencana",
  critical: "Butuh Bantuan",
  safe: "Relatif Aman",
};

const statusOrder = ["critical", "major", "warning", "safe"] as const;

const statusLabels: Record<MapPoint["status"], string> = {
  critical: "BAHAYA",
  major: "TERDAMPAK",
  warning: "WASPADA",
  safe: "AMAN",
};

const publicStatusLabels: Record<MapPoint["status"], string> = {
  critical: "Bahaya Tinggi",
  major: "Terdampak Berat",
  warning: "Perlu Waspada",
  safe: "Relatif Aman",
};

const nearbyRadiusKm = 20;
const nearbyPreviewLimit = 3;

function isEventPoint(point: MapPoint) {
  return point.kind === "Kejadian" || point.kind === "Gempa";
}

function pointKindLabel(point: MapPoint) {
  if (isEventPoint(point)) return "Kejadian aktif";
  if (point.kind === "Posko") return "Posko";
  if (point.kind === "Critical Need") return "Kebutuhan kritis";
  return "Distribusi";
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

function publicLocationForPoint(point: MapPoint) {
  if (point.kind === "Gempa" && point.location.includes(",")) {
    const area = point.location.split(",").at(-1)?.trim();
    return area ? `Sekitar ${area}` : point.location;
  }

  return point.location;
}

function distanceInKm(first: MapPoint, second: MapPoint) {
  const earthRadiusKm = 6371;
  const latitudeDelta = ((second.latitude - first.latitude) * Math.PI) / 180;
  const longitudeDelta = ((second.longitude - first.longitude) * Math.PI) / 180;
  const firstLatitude = (first.latitude * Math.PI) / 180;
  const secondLatitude = (second.latitude * Math.PI) / 180;
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestPoints(point: MapPoint, points: MapPoint[], kind: MapPoint["kind"], radiusKm = nearbyRadiusKm) {
  return points
    .filter((item) => item.kind === kind && item.id !== point.id)
    .map((item) => ({ point: item, distance: distanceInKm(point, item) }))
    .sort((first, second) => first.distance - second.distance)
    .filter((item) => item.distance <= radiusKm);
}

function formatDistance(distance: number) {
  if (distance < 1) return `${Math.round(distance * 1000)} m`;
  return `${distance.toFixed(distance < 10 ? 1 : 0).replace(".", ",")} km`;
}

function googleMapsRouteUrl(point: MapPoint) {
  return `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`;
}

function shareTextForPoint(point: MapPoint, updatedAt: string) {
  return [
    "SiagaKita",
    point.name,
    `Jenis: ${pointKindLabel(point)}`,
    `Status: ${publicStatusLabels[point.status]}`,
    `Lokasi: ${point.location}`,
    `Diperbarui: ${updatedAt}`,
  ].join("\n");
}

function detailAdvice(point: MapPoint) {
  if (point.kind === "Posko") return "Datang hanya bila wilayah sekitar aman.";
  if (point.kind === "Gempa") return "Ikuti info BMKG dan arahan petugas setempat.";
  if (point.status === "critical") return "Hindari area terdampak dan ikuti arahan petugas.";
  return "Pantau pembaruan sebelum menuju lokasi.";
}

function formatImpact(meta?: PublicPointMeta) {
  if (!meta?.affectedPeople && !meta?.activeShelters) return "Dampak rinci mengikuti pembaruan petugas.";

  const parts = [];
  if (meta.affectedPeople) parts.push(`${meta.affectedPeople.toLocaleString("id-ID")} warga terdampak`);
  if (meta.activeShelters) parts.push(`${meta.activeShelters} posko aktif`);
  return parts.join(" · ");
}

export function DisasterFilter({
  filter,
  onFilterChange,
}: {
  filter: PublicFilter;
  onFilterChange: (filter: PublicFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filterItems: { id: PublicFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "all", label: filterLabels.all, icon: GlobeIcon },
    { id: "events", label: filterLabels.events, icon: BellIcon },
    { id: "critical", label: filterLabels.critical, icon: ExclamationTriangleIcon },
    { id: "safe", label: filterLabels.safe, icon: CheckCircledIcon },
  ];

  const activeItem = filterItems.find((item) => item.id === filter) ?? filterItems[0];
  const ActiveIcon = activeItem.icon;

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="disaster-filter-morph" data-open={open ? "true" : "false"} aria-label="Filter titik publik">
      <button
        type="button"
        className="disaster-filter-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="disaster-filter-trigger-left">
          <MixerHorizontalIcon className="size-3.5 text-muted-foreground" />
          <span className="disaster-filter-trigger-label">
            {activeItem.id === "all" ? "Semua Titik" : activeItem.label}
          </span>
        </span>
        <ChevronDownIcon className={cn("disaster-filter-chevron size-3.5 text-muted-foreground", open && "is-open")} />
      </button>

      <div className="disaster-filter-panel" role="listbox">
        {filterItems.map((item) => {
          const isSelected = filter === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              className={cn("disaster-filter-option", isSelected && "is-selected")}
              onClick={() => {
                onFilterChange(item.id);
                setOpen(false);
              }}
            >
              <span className="disaster-filter-option-icon" data-status={item.id}>
                <Icon className="size-3.5" />
              </span>
              <span className="disaster-filter-option-label">{item.label}</span>
              {isSelected ? <CheckIcon className="size-3.5 shrink-0 text-foreground" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DisasterSearch({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
}) {
  return (
    <div className="disaster-search p-0 overflow-hidden">
      <ClearInput
        value={query}
        onChange={onQueryChange}
        placeholder="Cari posko atau wilayah"
        aria-label="Cari posko atau wilayah"
        className="h-full"
      />
    </div>
  );
}

export function DisasterListItem({
  point,
  meta,
  selected,
  onSelect,
}: {
  point: MapPoint;
  meta?: PublicPointMeta;
  selected?: boolean;
  onSelect: (point: MapPoint) => void;
}) {
  const updatedAt = meta?.updatedAt ?? point.updatedAt ?? "berkala";
  const image = meta?.image;

  return (
    <button
      type="button"
      className={cn("disaster-list-item", selected && "is-active")}
      data-status={point.status}
      data-kind={point.kind}
      onClick={() => onSelect(point)}
      aria-label={`Buka detail ${point.name}`}
    >
      <span className={cn("disaster-list-media", !image?.src && "is-empty")}>
        {image?.src ? (
          <img
            src={image.src}
            alt={image.alt}
            className="disaster-list-media-img"
            loading="lazy"
          />
        ) : (
          <span className="disaster-list-media-label">Belum ada foto</span>
        )}
      </span>
      <span className="disaster-list-content">
        <span className="disaster-list-topline">
          <span className="disaster-list-title">{point.name}</span>
          <span className="disaster-list-status-badge">
            {publicStatusLabels[point.status]}
          </span>
        </span>
        <span className="disaster-list-location">
          <span className="truncate">{publicLocationForPoint(point)}</span>
        </span>
        <span className="disaster-list-meta">
          <span>{updatedAt}</span>
          {meta?.cue ? (
            <>
              <span className="disaster-list-meta-divider" aria-hidden="true">•</span>
              <span className="disaster-list-cue">{meta.cue}</span>
            </>
          ) : null}
        </span>
      </span>
    </button>
  );
}

export function DisasterSidebar({
  filteredPoints,
  sidebarPoints,
  selectedPointId,
  query,
  filter,
  externalSources,
  pointMeta,
  onQueryChange,
  onFilterChange,
  onReset,
  onSelectPoint,
}: DisasterSidebarProps) {
  return (
    <Card className="disaster-sidebar-card pointer-events-auto flex h-full flex-col overflow-hidden border bg-card/98 shadow-md lg:h-full lg:rounded-none lg:border-y-0 lg:border-l-0 lg:border-r">
      <div className="disaster-sidebar-top">
        <div className="disaster-brand-row">
          <img
            src="/brand/logo-siagakita.png"
            alt="Logo SiagaKita"
            className="disaster-brand-logo"
          />
          <div className="disaster-brand-heading">
            <h1 className="disaster-brand-title">Peta Publik SiagaKita</h1>
            <p className="disaster-brand-subtitle">Pantauan darurat dan titik posko</p>
          </div>
        </div>
        <div className="disaster-sidebar-controls max-lg:hidden">
          <DisasterSearch query={query} onQueryChange={onQueryChange} />
          <DisasterFilter filter={filter} onFilterChange={onFilterChange} />
        </div>
      </div>

      <ScrollArea className="mobile-sheet-scroll min-h-0 flex-1">
        <div className="disaster-list">
          {query ? <p className="disaster-list-query">Hasil untuk &quot;{query}&quot;.</p> : null}
          {sidebarPoints.length ? (
            sidebarPoints.map((point) => (
              <DisasterListItem
                key={point.id}
                point={point}
                meta={pointMeta.get(point.id)}
                selected={point.id === selectedPointId}
                onSelect={onSelectPoint}
              />
            ))
          ) : (
            <div className="disaster-empty-state">
              <p>Tidak ada titik publik yang cocok dengan filter saat ini.</p>
              <Button type="button" variant="outline" className="h-9 rounded-full" onClick={onReset}>
                Tampilkan semua
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Legend status & fasilitas — 1 baris */}
      <div className="disaster-sidebar-legend">
        <p className="disaster-sidebar-legend-title">Keterangan</p>
        <ul className="disaster-sidebar-legend-list">
          <li className="disaster-sidebar-legend-item">
            <span className="disaster-sidebar-legend-label" data-status="critical">Bahaya</span>
          </li>
          <li className="disaster-sidebar-legend-sep" aria-hidden="true">•</li>
          <li className="disaster-sidebar-legend-item">
            <span className="disaster-sidebar-legend-label" data-status="major">Terdampak</span>
          </li>
          <li className="disaster-sidebar-legend-sep" aria-hidden="true">•</li>
          <li className="disaster-sidebar-legend-item">
            <span className="disaster-sidebar-legend-label" data-status="warning">Waspada</span>
          </li>
          <li className="disaster-sidebar-legend-sep" aria-hidden="true">•</li>
          <li className="disaster-sidebar-legend-item">
            <span className="disaster-sidebar-legend-label" data-status="safe">Aman</span>
          </li>
          <li className="disaster-sidebar-legend-divider" aria-hidden="true" />
          <li className="disaster-sidebar-legend-item disaster-sidebar-legend-posko">
            <HomeIcon className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>Posko</span>
          </li>
        </ul>
      </div>

      {/* Sumber — paling bawah, sticky */}
      <div className="disaster-sidebar-source">
        {externalSources.length ? (
          <>Sumber pendukung: {externalSources.join(", ")}.</>
        ) : (
          <>Data lapangan SiagaKita.</>
        )}
      </div>
    </Card>
  );
}

export function DisasterDetailPanel({
  point,
  points,
  meta,
  onClose,
  onSelectPoint,
}: DisasterDetailPanelProps) {
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const [showAllRelated, setShowAllRelated] = useState(false);
  const updatedAt = meta?.updatedAt ?? point.updatedAt ?? "berkala";
  const nearestShelters = useMemo(() => nearestPoints(point, points, "Posko"), [point, points]);
  const relatedPoints = point.kind === "Posko" ? [] : nearestShelters;
  const visibleRelatedPoints = showAllRelated ? relatedPoints : relatedPoints.slice(0, nearbyPreviewLimit);

  const sharePoint = async () => {
    const text = shareTextForPoint(point, updatedAt);
    const url = typeof window !== "undefined" ? window.location.href : "";

    try {
      if (navigator.share) {
        await navigator.share({ title: point.name, text, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url ? `${text}\n${url}` : text);
        setShareStatus("copied");
        window.setTimeout(() => setShareStatus("idle"), 1800);
      }
    } catch {
      setShareStatus("idle");
    }
  };

  return (
    <Card className="disaster-subsidebar-card pointer-events-auto flex h-full flex-col overflow-hidden border bg-card/98 shadow-md lg:h-full lg:rounded-none lg:border-y-0 lg:border-l-0 lg:border-r" aria-label={`Detail ${point.name}`}>
      <div className="disaster-subsidebar-header">
        {/* Tombol Kembali (Mobile) */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors -ml-1 py-0.5 px-1.5 rounded-md hover:bg-muted"
          aria-label="Kembali ke daftar bencana"
        >
          <ArrowLeftIcon className="size-4" />
          <span>Kembali</span>
        </button>

        <div className="flex items-center gap-2 ml-auto lg:ml-0">
          <span className="disaster-list-status-badge">
            {publicStatusLabels[point.status]}
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            {pointKindLabel(point)}
          </span>
        </div>

        <button
          type="button"
          className="disaster-subsidebar-close hidden lg:inline-flex"
          onClick={onClose}
          aria-label="Tutup detail"
        >
          <Cross2Icon className="size-3.5" />
        </button>
      </div>

      <ScrollArea className="mobile-sheet-scroll min-h-0 flex-1">
        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground leading-snug">{point.name}</h2>
            <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">{publicSummaryForPoint(point, meta?.summary)}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 border-y border-border/60 py-3 text-[12px]">
            <div>
              <span className="block text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium">Lokasi</span>
              <strong className="mt-0.5 block font-medium text-foreground text-[12px]">{point.location}</strong>
            </div>
            <div>
              <span className="block text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium">Pembaruan</span>
              <strong className="mt-0.5 block font-medium text-foreground text-[12px]">{updatedAt}</strong>
            </div>
            <div className="col-span-2 pt-1">
              <span className="block text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium">Dampak</span>
              <strong className="mt-0.5 block font-normal text-foreground text-[12px] leading-relaxed">{formatImpact(meta)}</strong>
            </div>
            <div className="col-span-2 pt-1">
              <span className="block text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium">Arahan</span>
              <strong className="mt-0.5 block font-normal text-foreground text-[12px] leading-relaxed">{detailAdvice(point)}</strong>
            </div>
          </div>

          <div className="flex gap-2">
            <Button asChild variant="default" className="h-8 flex-1 rounded-md text-[12px] font-medium shadow-none">
              <a href={googleMapsRouteUrl(point)} target="_blank" rel="noreferrer" aria-label={`Buka rute ke ${point.name} di Google Maps`}>
                <PaperPlaneIcon className="size-3.5 mr-1.5" />
                Buka Rute
              </a>
            </Button>
            <Button type="button" variant="outline" className="h-8 rounded-md px-3 text-[12px] font-medium shadow-none" onClick={sharePoint}>
              <Share1Icon className="size-3.5 mr-1.5" />
              {shareStatus === "copied" ? "Tersalin" : "Bagikan"}
            </Button>
          </div>

          {relatedPoints.length ? (
            <div className="pt-2 border-t border-border/60 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <h3 className="font-semibold text-foreground">Posko Terdekat</h3>
                <span className="text-muted-foreground">radius {nearbyRadiusKm} km</span>
              </div>
              <div className="space-y-1.5">
                {visibleRelatedPoints.map(({ point: relatedPoint, distance }) => (
                  <button
                    key={relatedPoint.id}
                    type="button"
                    className="w-full text-left p-2 rounded-md border border-border/60 hover:border-slate-400/60 transition-colors flex items-center justify-between gap-2"
                    onClick={() => onSelectPoint(relatedPoint, { preserveContext: true })}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-foreground">{relatedPoint.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{relatedPoint.location}</span>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-foreground/70">{formatDistance(distance)}</span>
                  </button>
                ))}
              </div>
              {relatedPoints.length > nearbyPreviewLimit ? (
                <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground font-medium p-0" onClick={() => setShowAllRelated((value) => !value)}>
                  {showAllRelated ? "Tampilkan lebih sedikit" : `Lihat semua ${relatedPoints.length} posko`}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </Card>
  );
}






