"use client";

import Link from "next/link";
import { ClearInput } from "@/components/ui/clear-input";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  CheckCircledIcon,
  GlobeIcon,
  BellIcon,
  CheckIcon,
  ChevronDownIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  ExternalLinkIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  PaperPlaneIcon,
  Share1Icon,
  TargetIcon,
} from "@radix-ui/react-icons";
import type { MapPoint, VolcanoCctv } from "@/components/crisis-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { CurrentProfile } from "@/lib/auth-types";
import { cn, getPointTimestamp } from "@/lib/utils";

export type PublicFilter = "all" | "shelters" | "events" | "critical" | "safe";

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
  currentUser?: CurrentProfile | null;
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
  all: "Semua Titik",
  shelters: "Posko Bantuan",
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
  critical: "Bahaya",
  major: "Terdampak",
  warning: "Waspada",
  safe: "Aman",
};

function getPointStatusLabel(point: MapPoint): string {
  if (point.kind === "Gunung Api") {
    const text = `${point.name} ${point.detail}`;
    if (/Level\s+IV|Awas/i.test(text)) return "Awas";
    if (/Level\s+III|Siaga/i.test(text)) return "Siaga";
    if (/Level\s+II|Waspada/i.test(text)) return "Waspada";
    if (/Level\s+I|Normal/i.test(text)) return "Normal";
    if (point.status === "critical") return "Awas";
    if (point.status === "major") return "Siaga";
    if (point.status === "warning") return "Waspada";
    return "Normal";
  }
  if (point.kind === "Gempa") {
    if (point.magnitude) return `M ${point.magnitude}`;
    return publicStatusLabels[point.status] || "Waspada";
  }
  return publicStatusLabels[point.status] || "Siaga";
}

const nearbyRadiusKm = 20;
const nearbyPreviewLimit = 3;

function isEventPoint(point: MapPoint) {
  return point.kind === "Kejadian" || point.kind === "Gempa" || point.kind === "Gunung Api";
}

function pointKindLabel(point: MapPoint) {
  if (point.kind === "Gunung Api") return "Aktivitas Vulkanik";
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
  if (point.kind === "Gunung Api") {
    return point.detail || `Aktivitas vulkanik terdeteksi di ${point.name}. Patuhi batas jarak aman PVMBG.`;
  }

  return summary ?? point.detail;
}

export function parseEarthquakeLocation(rawLocation: string) {
  let text = (rawLocation || "").trim();
  text = text.replace(/^Pusat gempa berada di\s+/i, "");

  const isSea = /^laut\b/i.test(text);
  const isLand = /^darat\b/i.test(text);
  text = text.replace(/^(laut|darat)\s+/i, "");

  // Match pattern: "74 km timur laut Banggai" or "81 km Selatan Kab Bandung"
  const distMatch = text.match(/^(\d+\s*km\s+[A-Za-z0-9\-]+(?:\s+[A-Za-z0-9\-]+)?)\s+(.+)$/i);
  if (distMatch) {
    const distAndDir = distMatch[1].trim();
    let place = distMatch[2].trim();
    // Normalize casing if all caps (e.g. CIANJUR -> Cianjur)
    if (place === place.toUpperCase() && place.length > 3) {
      place = place.charAt(0).toUpperCase() + place.slice(1).toLowerCase();
    }
    const envTag = isSea ? "Laut" : isLand ? "Darat" : "";
    return {
      title: place,
      subtitle: `${distAndDir}${envTag ? ` (${envTag})` : ""}`,
    };
  }

  // Pattern: "Sekitar Manggarai"
  const sekitarMatch = text.match(/^sekitar\s+(.+)$/i);
  if (sekitarMatch) {
    return {
      title: sekitarMatch[1].trim(),
      subtitle: isSea ? "Pusat di laut" : "Pusat di daratan",
    };
  }

  // Fallback
  return {
    title: text || "Gempa Bumi Terkini",
    subtitle: isSea ? "Pusat di laut" : isLand ? "Pusat di darat" : "",
  };
}

export function getEarthquakeDisplayInfo(point: MapPoint) {
  const magRaw = point.magnitude || point.detail.match(/M\s*([\d.]+)/i)?.[1] || "";
  const magNum = parseFloat(magRaw) || 0;
  const magDisplay = magNum > 0 ? magNum.toFixed(1) : (magRaw || "—");

  let severity: "critical" | "major" | "warning" | "safe" = "warning";
  if (magNum >= 6.0 || point.status === "critical") {
    severity = "critical";
  } else if (magNum >= 5.0 || point.status === "major") {
    severity = "major";
  } else if (magNum >= 4.0 || point.status === "warning") {
    severity = "warning";
  } else {
    severity = "safe";
  }

  const { title, subtitle } = parseEarthquakeLocation(point.location);
  const isFelt = Boolean(point.feltScale) || /dirasakan|merusak|tsunami|mmi/i.test(point.detail);
  const depth = point.depth || point.detail.match(/kedalaman\s*([\d.]+\s*(?:km|m))/i)?.[1];

  return {
    mag: magDisplay,
    severity,
    title,
    subtitle,
    isFelt,
    depth,
  };
}

export function getVolcanoDisplayInfo(point: MapPoint) {
  const text = `${point.name} ${point.detail}`;
  let roman = "II";
  let label = "Waspada";
  let severity: "critical" | "major" | "warning" | "safe" = "warning";

  if (/Level\s+IV|Awas/i.test(text) || point.status === "critical") {
    roman = "IV";
    label = "Awas";
    severity = "critical";
  } else if (/Level\s+III|Siaga/i.test(text) || point.status === "major") {
    roman = "III";
    label = "Siaga";
    severity = "major";
  } else if (/Level\s+II|Waspada/i.test(text) || point.status === "warning") {
    roman = "II";
    label = "Waspada";
    severity = "warning";
  } else {
    roman = "I";
    label = "Normal";
    severity = "safe";
  }

  return {
    roman,
    label,
    severity,
  };
}

function publicLocationForPoint(point: MapPoint) {
  if (point.kind === "Gempa") {
    const parsed = parseEarthquakeLocation(point.location);
    return `${parsed.title} • ${parsed.subtitle}`;
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
    { id: "shelters", label: filterLabels.shelters, icon: HomeIcon },
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
        aria-controls="disaster-filter-options"
      >
        <span className="disaster-filter-trigger-left">
          <MixerHorizontalIcon className="size-3.5 text-muted-foreground" />
          <span className="disaster-filter-trigger-label">
            {activeItem.id === "all" ? "Semua Titik" : activeItem.label}
          </span>
        </span>
        <ChevronDownIcon className={cn("disaster-filter-chevron size-3.5 text-muted-foreground", open && "is-open")} />
      </button>

      <div id="disaster-filter-options" className="disaster-filter-panel" role="listbox">
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

function renderItemMedia(point: MapPoint, meta?: PublicPointMeta) {
  const fallbackByKind: Record<string, { src: string; alt: string; badge: string }> = {
    "Gempa": {
      src: "/icons/earthquake/gb.png",
      alt: `Sensor seismograf gempa ${point.name}`,
      badge: "BMKG",
    },
    "Gunung Api": {
      src: "/images/volcano-merapi.jpg",
      alt: `Aktivitas kawah ${point.name}`,
      badge: "PVMBG",
    },
    "Posko": {
      src: "/images/shelter-camp.jpg",
      alt: `Tenda posko pengungsian ${point.name}`,
      badge: "POSKO",
    },
    "Critical Need": {
      src: "/images/shelter-camp.jpg",
      alt: `Kebutuhan logistik ${point.name}`,
      badge: "LOGISTIK",
    },
    "Kejadian": {
      src: "/images/disaster-cugenang.jpg",
      alt: `Penanganan darurat ${point.name}`,
      badge: "DARURAT",
    },
  };

  const fallback = fallbackByKind[point.kind] ?? fallbackByKind["Kejadian"];
  const imageAlt = meta?.image?.alt || fallback.alt;
  let imageSrc = meta?.image?.src || fallback.src;
  let badgeText = fallback.badge;

  if (point.kind === "Gunung Api") {
    const hasCctv = Boolean(point.hasCctv || (point.cctvList && point.cctvList.length > 0));
    imageSrc = point.eruptionReport?.imageUrl || point.cctvList?.[0]?.imageUrl || meta?.image?.src || fallback.src;
    badgeText = point.isErupting ? "ERUPSI" : hasCctv ? "CCTV" : fallback.badge;
  } else if (point.kind === "Gempa") {
    const isFelt = point.status === "critical" || point.status === "major" || /dirasakan|merusak|tsunami|mmi/i.test(point.detail);
    imageSrc = point.shakemapUrl || (isFelt ? "/icons/earthquake/gb-t.png" : "/icons/earthquake/gb.png");
    badgeText = isFelt ? "DIRASAKAN" : "BMKG";
  }

  return (
    <span className="disaster-list-media">
      <img
        src={imageSrc}
        alt={imageAlt}
        className="disaster-list-media-img"
        loading="lazy"
      />
      <span className="disaster-list-media-badge" data-kind={point.kind}>
        {badgeText}
      </span>
    </span>
  );
}

export function DisasterListItem({
  point,
  meta,
  selected,
  onSelect,
  isTextOnly,
}: {
  point: MapPoint;
  meta?: PublicPointMeta;
  selected?: boolean;
  onSelect: (point: MapPoint) => void;
  isTextOnly?: boolean;
}) {
  const updatedAt = meta?.updatedAt ?? point.updatedAt ?? "berkala";
  const itemShellClassName = cn("disaster-list-item", selected && "is-active");

  function renderCard({
    title,
    description,
    status,
    statusValue,
    metaItems,
    media,
    ariaLabel,
  }: {
    title: string;
    description: string;
    status: string;
    statusValue: MapPoint["status"];
    metaItems: string[];
    media?: ReactNode;
    ariaLabel: string;
  }) {
    const visibleMetaItems = metaItems.filter(Boolean);

    return (
      <button
        type="button"
        className={itemShellClassName}
        data-status={statusValue}
        data-kind={point.kind}
        onClick={() => onSelect(point)}
        aria-label={ariaLabel}
      >
        <Card className="disaster-list-card">
          {media}
          <div className="disaster-list-content">
            <CardHeader className="disaster-list-card-header">
              <CardTitle className="disaster-list-title truncate">{title}</CardTitle>
              <CardDescription className="disaster-list-location truncate">
                {description}
              </CardDescription>
              <CardAction>
                <Badge
                  variant="outline"
                  className="disaster-list-status-badge"
                  data-status={statusValue}
                >
                  {status}
                </Badge>
              </CardAction>
            </CardHeader>
            {visibleMetaItems.length > 0 && (
              <CardContent className="disaster-list-card-content">
                <div className="disaster-list-meta">
                  {visibleMetaItems.map((item, index) => (
                    <span className="disaster-list-meta-item" key={`${point.id}-${item}-${index}`}>
                      {index > 0 && (
                        <Separator
                          orientation="vertical"
                          className="disaster-list-meta-separator"
                          aria-hidden="true"
                        />
                      )}
                      <span className="truncate">{item}</span>
                    </span>
                  ))}
                </div>
              </CardContent>
            )}
          </div>
        </Card>
      </button>
    );
  }

  if (point.kind === "Gempa") {
    const quake = getEarthquakeDisplayInfo(point);
    return renderCard({
      title: `Gempa M ${quake.mag}`,
      description: `${quake.title} • ${quake.subtitle}`,
      status: quake.isFelt ? "Dirasakan" : "BMKG",
      statusValue: quake.severity,
      metaItems: [quake.depth ? `Kedalaman ${quake.depth}` : "", updatedAt, "BMKG"],
      ariaLabel: `Buka detail gempa ${quake.title}, Magnitudo ${quake.mag}, ${quake.subtitle}`,
    });
  }

  if (point.kind === "Gunung Api") {
    const volcano = getVolcanoDisplayInfo(point);
    return renderCard({
      title: point.name,
      description: publicLocationForPoint(point),
      status: point.isErupting ? "Erupsi" : volcano.label,
      statusValue: volcano.severity,
      metaItems: [
        `Level ${volcano.roman} ${volcano.label}`,
        updatedAt,
        point.hasCctv ? "Live CCTV" : "PVMBG",
      ],
      ariaLabel: `Buka detail aktivitas ${point.name}, Level ${volcano.roman} ${volcano.label}`,
    });
  }

  // Standard Operational Disaster & Shelter Item
  return renderCard({
    title: point.name,
    description: publicLocationForPoint(point),
    status: getPointStatusLabel(point),
    statusValue: point.status,
    metaItems: [updatedAt, meta?.cue ?? ""],
    media: !isTextOnly ? renderItemMedia(point, meta) : undefined,
    ariaLabel: `Buka detail ${point.name}`,
  });
}

function DisasterGroupAccordion({
  id,
  title,
  subtitle,
  badgeText,
  badgeVariant,
  points,
  pointMeta,
  selectedPointId,
  onSelectPoint,
  defaultOpen = false,
  isSearched = false,
}: {
  id: string;
  title: string;
  subtitle?: string;
  badgeText: string;
  badgeVariant?: "volcano" | "earthquake";
  points: MapPoint[];
  pointMeta: Map<string, PublicPointMeta>;
  selectedPointId?: string;
  onSelectPoint: (point: MapPoint) => void;
  defaultOpen?: boolean;
  isSearched?: boolean;
}) {
  const containsSelected = points.some((p) => p.id === selectedPointId);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (containsSelected || isSearched) {
      setIsOpen(true);
    }
  }, [containsSelected, isSearched]);

  return (
    <div className="disaster-accordion-group" data-open={isOpen}>
      <button
        type="button"
        className="disaster-accordion-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={`accordion-panel-${id}`}
      >
        <div className="disaster-accordion-left min-w-0 flex-1">
          <span className="disaster-accordion-title truncate">{title}</span>
          {subtitle && <span className="disaster-accordion-subtitle">{subtitle}</span>}
        </div>
        <div className="disaster-accordion-right shrink-0 flex items-center gap-2">
          <span className={cn("disaster-accordion-count-badge shrink-0", badgeVariant)}>
            {badgeText}
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200 shrink-0",
              isOpen && "rotate-180 text-foreground"
            )}
            aria-hidden="true"
          />
        </div>
      </button>

      <div
        id={`accordion-panel-${id}`}
        className="disaster-accordion-panel"
        aria-hidden={!isOpen}
      >
        <div className="disaster-accordion-panel-inner">
          {points.map((point) => (
            <DisasterListItem
              key={point.id}
              point={point}
              meta={pointMeta.get(point.id)}
              selected={point.id === selectedPointId}
              onSelect={onSelectPoint}
              isTextOnly={true}
            />
          ))}
        </div>
      </div>
    </div>
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
  currentUser,
  onQueryChange,
  onFilterChange,
  onReset,
  onSelectPoint,
}: DisasterSidebarProps) {
  const operationalPoints = useMemo(
    () => [...sidebarPoints.filter((p) => p.kind !== "Gunung Api" && p.kind !== "Gempa")].sort((a, b) => getPointTimestamp(b) - getPointTimestamp(a)),
    [sidebarPoints],
  );

  const volcanoPoints = useMemo(
    () => sidebarPoints.filter((p) => p.kind === "Gunung Api"),
    [sidebarPoints],
  );

  const earthquakePoints = useMemo(
    () => [...sidebarPoints.filter((p) => p.kind === "Gempa")].sort((a, b) => getPointTimestamp(b) - getPointTimestamp(a)),
    [sidebarPoints],
  );

  const volcanoBadge = useMemo(() => {
    const criticalCount = volcanoPoints.filter((p) => p.status === "critical").length;
    const majorCount = volcanoPoints.filter((p) => p.status === "major").length;
    if (criticalCount > 0) return `${criticalCount} Awas`;
    if (majorCount > 0) return `${majorCount} Siaga`;
    return `${volcanoPoints.length} Gunung`;
  }, [volcanoPoints]);

  const earthquakeBadge = useMemo(() => {
    return `${earthquakePoints.length} Gempa`;
  }, [earthquakePoints]);

  return (
    <Card
      className="disaster-sidebar-card pointer-events-auto flex h-full flex-col overflow-hidden border bg-card/98 shadow-md lg:h-full lg:rounded-none lg:border-y-0 lg:border-l-0 lg:border-r"
      suppressHydrationWarning
    >
      <div className="disaster-sidebar-top">
        <div className="disaster-brand-row flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/"
              className="flex items-center shrink-0 transition-opacity hover:opacity-85 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
              title="Beranda SiagaKita"
            >
              <img
                src="/brand/logo-siagakita.png"
                alt="Logo SiagaKita"
                className="h-7 w-auto max-w-[110px] object-contain shrink-0 dark:invert dark:brightness-125"
              />
            </Link>
            <div className="h-4.5 w-px bg-border/80 shrink-0 max-sm:hidden" aria-hidden="true" />
            <div className="disaster-brand-heading min-w-0 max-sm:hidden">
              <h1 className="disaster-brand-title text-foreground font-semibold">Peta Publik</h1>
              <p className="disaster-brand-subtitle text-muted-foreground">Pantauan darurat & posko</p>
            </div>
          </div>
          {currentUser ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-7 gap-1 rounded-md px-2.5 text-[11px] font-medium transition-colors hover:bg-primary hover:text-primary-foreground shrink-0"
            >
              <Link href="/dashboard">
                Buka Console Operasi <span aria-hidden="true">&rarr;</span>
              </Link>
            </Button>
          ) : null}
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
            <>
              {/* Tanggap Darurat Lapangan & Posko Aktif (Dengan visual dokumentasi) */}
              {operationalPoints.map((point) => (
                <DisasterListItem
                  key={point.id}
                  point={point}
                  meta={pointMeta.get(point.id)}
                  selected={point.id === selectedPointId}
                  onSelect={onSelectPoint}
                />
              ))}

              {/* Pantauan Gunung Api (PVMBG) - Format Teks Bersih */}
              {volcanoPoints.length > 0 && (
                <DisasterGroupAccordion
                  id="gunung-api"
                  title="Aktivitas Gunung Api"
                  subtitle="PVMBG"
                  badgeText={volcanoBadge}
                  badgeVariant="volcano"
                  points={volcanoPoints}
                  pointMeta={pointMeta}
                  selectedPointId={selectedPointId}
                  onSelectPoint={onSelectPoint}
                  isSearched={Boolean(query)}
                />
              )}

              {/* Sensor Gempa Bumi (BMKG) - Format Teks Bersih */}
              {earthquakePoints.length > 0 && (
                <DisasterGroupAccordion
                  id="gempa-bumi"
                  title="Pemantauan Gempa Bumi"
                  subtitle="BMKG"
                  badgeText={earthquakeBadge}
                  badgeVariant="earthquake"
                  points={earthquakePoints}
                  pointMeta={pointMeta}
                  selectedPointId={selectedPointId}
                  onSelectPoint={onSelectPoint}
                  defaultOpen={true}
                  isSearched={Boolean(query)}
                />
              )}
            </>
          ) : sidebarPoints.length === 0 && !query && filter === "all" ? (
            <div className="disaster-empty-state p-6 text-center space-y-2">
              <div className="mx-auto size-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircledIcon className="size-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Kondisi Terpantau Aman
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Belum ada kejadian bencana darurat atau posko aktif yang dibuka saat ini. Seluruh sistem pemantauan berada dalam kondisi siaga.
              </p>
              <div className="pt-2">
                <Link
                  href="/lapor"
                  className="inline-flex items-center gap-1.5 h-8.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                >
                  Laporkan Kejadian / Bencana
                </Link>
              </div>
            </div>
          ) : (
            <div className="disaster-empty-state p-6 text-center">
              <p className="text-[13px] font-semibold text-foreground">
                {query ? `Tidak ada data untuk "${query}"` : "Tidak ada lokasi bencana yang cocok"}
              </p>
              <p className="text-[11.5px] text-muted-foreground mt-1 mb-3">
                Periksa ejaan nama wilayah atau reset filter status pemantauan.
              </p>
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-full text-xs px-3.5" onClick={onReset}>
                Reset & Tampilkan Semua
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>


      {/* Sumber Pendukung — Clean Footer */}
      <div className="flex items-center justify-between border-t border-border/60 px-3.5 py-2 bg-muted/20 text-[11px] text-muted-foreground">
        <span className="truncate">
          {externalSources.length ? (
            <>Sumber: {externalSources.join(", ")}</>
          ) : (
            <>Data Lapangan SiagaKita</>
          )}
        </span>
        <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-2 font-mono">
          Live Feed
        </span>
      </div>
    </Card>
  );
}

const clientCctvCache = new Map<string, VolcanoCctv[]>();

function VolcanoCctvSection({
  initialCctvs,
  volcanoName,
}: {
  initialCctvs?: VolcanoCctv[];
  volcanoName: string;
}) {
  const cacheKey = volcanoName.toLowerCase().replace(/^(gunung|g\.)\s+/i, "").replace(/\s*\(.*\)$/, "").trim();
  const [cctvs, setCctvs] = useState<VolcanoCctv[]>(
    initialCctvs && initialCctvs.length > 0
      ? initialCctvs
      : clientCctvCache.get(cacheKey) || []
  );
  const [loading, setLoading] = useState(cctvs.length === 0);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (initialCctvs && initialCctvs.length > 0) {
      setCctvs(initialCctvs);
      clientCctvCache.set(cacheKey, initialCctvs);
      setLoading(false);
      return;
    }

    const cached = clientCctvCache.get(cacheKey);
    if (cached && cached.length > 0) {
      setCctvs(cached);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    fetch(`/api/alerts/volcano-cctv?volcano=${encodeURIComponent(cacheKey)}`)
      .then((res) => res.json())
      .then((data) => {
        if (active && data.ok && Array.isArray(data.cctvList) && data.cctvList.length > 0) {
          setCctvs(data.cctvList);
          clientCctvCache.set(cacheKey, data.cctvList);
        }
      })
      .catch((err) => {
        console.warn("Failed fetching on-demand volcano CCTV:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cacheKey, initialCctvs]);

  if (loading && cctvs.length === 0) {
    return (
      <div className="rounded-xl border border-border/80 p-3.5 space-y-2.5 animate-pulse bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-36 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
        <div className="aspect-[16/9] w-full rounded-lg bg-muted/60" />
      </div>
    );
  }

  if (cctvs.length === 0) return null;

  const activeCctv = cctvs[selectedIdx] || cctvs[0];
  if (!activeCctv) return null;

  return (
    <div className="rounded-xl border border-border/80 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
          Live CCTV Pos Pengamatan ({cctvs.length} Kamera)
        </span>
        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
          PVMBG Magma
        </span>
      </div>

      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-border/80 shadow-xs group bg-black/5">
        <img
          src={activeCctv.imageUrl}
          alt={activeCctv.label || `CCTV ${volcanoName}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2 flex items-center justify-between text-white">
          <span className="text-[10.5px] font-medium backdrop-blur-xs truncate max-w-[70%]">
            {activeCctv.label || activeCctv.locationName || volcanoName}
          </span>
          <a
            href={activeCctv.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-medium underline hover:text-amber-200 shrink-0"
          >
            Buka Foto Penuh
          </a>
        </div>
      </div>

      {cctvs.length > 1 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] text-muted-foreground font-medium block">Pilih Kamera:</span>
          <div className="flex flex-wrap gap-1.5">
            {cctvs.map((cam, idx) => {
              const isSelected = idx === selectedIdx;
              const shortLabel = cam.locationName || cam.label.split("-").pop()?.trim() || `Kamera ${idx + 1}`;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  className={cn(
                    "rounded px-2.5 py-1 text-[11px] font-medium transition-colors border",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border-border/60"
                  )}
                >
                  {shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
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
  const latestGempaWithShakemap = useMemo(
    () => points.find((p) => p.kind === "Gempa" && Boolean(p.shakemapUrl)),
    [points]
  );
  const earthquakeShakemapUrl = point.shakemapUrl || latestGempaWithShakemap?.shakemapUrl;
  const hasDedicatedMedia = (point.kind === "Gunung Api" && Boolean(
    point.eruptionReport?.imageUrl || point.hasCctv || (point.cctvList && point.cctvList.length > 0)
  )) || (point.kind === "Gempa" && Boolean(earthquakeShakemapUrl));

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
    <Card
      className="disaster-subsidebar-card pointer-events-auto flex h-full flex-col overflow-hidden border bg-card/98 shadow-md lg:h-full lg:rounded-none lg:border-y-0 lg:border-l-0 lg:border-r"
      aria-label={`Detail ${point.name}`}
      suppressHydrationWarning
    >
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
          <span className="disaster-list-status-badge" data-status={point.status}>
            {getPointStatusLabel(point)}
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
          {point.kind !== "Gempa" && point.kind !== "Gunung Api" && !hasDedicatedMedia && meta?.image?.src && (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-border/80 shadow-xs">
              <img
                src={meta.image.src}
                alt={meta.image.alt}
                className="h-full w-full object-cover"
              />
              {meta.image.source && (
                <span className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm backdrop-blur-xs">
                  Foto: {meta.image.source}
                </span>
              )}
            </div>
          )}
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

          {/* Laporan Dokumentasi & Erupsi Terkini (PVMBG Magma ESDM) */}
          {point.kind === "Gunung Api" && point.eruptionReport && (
            <div className="rounded-xl border border-border/80 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  Laporan Erupsi Terkini
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {point.eruptionReport.time}
                </span>
              </div>

              {point.eruptionReport.imageUrl && (
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-border/80 shadow-xs group">
                  <img
                    src={point.eruptionReport.imageUrl}
                    alt={`Visual letusan ${point.name}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2 flex items-center justify-between text-white">
                    <span className="text-[10px] font-medium backdrop-blur-xs">
                      CCTV / Dokumentasi Visual PVMBG
                    </span>
                    <a
                      href={point.eruptionReport.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-medium underline hover:text-amber-200"
                    >
                      Buka Foto Penuh
                    </a>
                  </div>
                </div>
              )}

              <p className="text-[12px] text-foreground/90 leading-relaxed p-2.5 rounded-md border border-border/60">
                {point.eruptionReport.description}
              </p>

              <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-border/60">
                <span>
                  Dibuat oleh: <strong className="font-medium text-foreground">{point.eruptionReport.author}</strong>
                </span>
                {point.eruptionReport.detailUrl && (
                  <a
                    href={point.eruptionReport.detailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <span>Detail Resmi</span>
                    <ExternalLinkIcon className="size-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Live CCTV Pos Pengamatan PVMBG Magma ESDM (On-Demand Loading) */}
          {point.kind === "Gunung Api" && (
            <VolcanoCctvSection initialCctvs={point.cctvList} volcanoName={point.name} />
          )}

          {/* Laporan Pengamatan Berkala PVMBG */}
          {point.kind === "Gunung Api" && point.observationReport && (
            <div className="rounded-xl border border-border/80 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  Laporan Pengamatan Berkala PVMBG
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {point.observationReport.period || "Terbaru"}
                </span>
              </div>

              {point.observationReport.visualSummary && (
                <p className="text-[12px] text-foreground/90 leading-relaxed p-2.5 rounded-md border border-border/60">
                  {point.observationReport.visualSummary}
                </p>
              )}

              <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-border/60">
                <span>
                  Petugas: <strong className="font-medium text-foreground">{point.observationReport.author || "PGA PVMBG"}</strong>
                </span>
                {point.observationReport.detailUrl && (
                  <a
                    href={point.observationReport.detailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <span>Detail Resmi</span>
                    <ExternalLinkIcon className="size-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Informasi Parameter Seismik & Shakemap BMKG / Magma ESDM */}
          {point.kind === "Gempa" && (
            <div className="rounded-xl border border-border/80 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  Informasi Parameter Seismik
                </span>
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {point.source || "BMKG"}
                </span>
              </div>

              {earthquakeShakemapUrl && (
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-border/80 shadow-xs group bg-black/5">
                  <img
                    src={earthquakeShakemapUrl}
                    alt={`Peta Guncangan Shakemap ${point.name}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2 flex items-center justify-between text-white">
                    <span className="text-[10px] font-medium backdrop-blur-xs">
                      Peta Guncangan Seismik (Shakemap)
                    </span>
                    <a
                      href={earthquakeShakemapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-medium underline hover:text-amber-200"
                    >
                      Buka Foto Penuh
                    </a>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-[11.5px] p-2 rounded-md bg-muted/40 border border-border/60">
                {point.magnitude && (
                  <div>
                    <span className="text-muted-foreground text-[10px] block uppercase">Magnitudo</span>
                    <strong className="font-semibold text-foreground text-[13px]">{point.magnitude} SR</strong>
                  </div>
                )}
                {point.depth && (
                  <div>
                    <span className="text-muted-foreground text-[10px] block uppercase">Kedalaman</span>
                    <strong className="font-semibold text-foreground text-[13px]">{point.depth}</strong>
                  </div>
                )}
                {point.tsunamiPotential && (
                  <div className="col-span-2 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px] block uppercase">Potensi Tsunami</span>
                    <span className="font-medium text-foreground">{point.tsunamiPotential}</span>
                  </div>
                )}
                {point.feltScale && (
                  <div className="col-span-2 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px] block uppercase">Intensitas Dirasakan</span>
                    <span className="font-medium text-foreground">{point.feltScale}</span>
                  </div>
                )}
              </div>
            </div>
          )}

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






