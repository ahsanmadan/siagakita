"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Home,
  MapPin,
  Search,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CrisisStatus, DisasterEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

// ── Status Krisis (Danger Condition) ──────────────────────────────────
const crisisLabels: Record<CrisisStatus, string> = {
  critical: "Bahaya Tinggi",
  major: "Terdampak Berat",
  warning: "Perlu Waspada",
  safe: "Relatif Aman",
};

const crisisBadgeStyles: Record<CrisisStatus, string> = {
  critical: "border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300",
  major: "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/15 dark:text-orange-300",
  warning: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
  safe: "border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-500/40 dark:bg-teal-500/15 dark:text-teal-300",
};

// ── Tingkat Eskalasi (Jurisdiction / Handling Level) ──────────────────
const escalationLabels: Record<DisasterEvent["escalationLevel"], string> = {
  Nasional: "Tingkat Nasional",
  Provinsi: "Tingkat Provinsi",
  Kabupaten: "Tingkat Kabupaten",
};

const escalationStyles: Record<DisasterEvent["escalationLevel"], string> = {
  Nasional: "border-purple-300 bg-purple-50 text-purple-900 dark:border-purple-500/40 dark:bg-purple-500/15 dark:text-purple-300",
  Provinsi: "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300",
  Kabupaten: "border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-300",
};

// ── Clean Human Incident Parser ───────────────────────────────────────
function parseHumanIncident(event: DisasterEvent) {
  // Strip coordinates like (-0.92832, 100.42664) or [GPS: ...] from title
  const cleaned = event.name
    .replace(/\s*\([-+]?\d+(\.\d+)?,\s*[-+]?\d+(\.\d+)?\)/g, "")
    .replace(/\s*\[.*?\]/g, "")
    .trim();

  // Split locality if title has commas
  const parts = cleaned.split(",");
  const primaryTitle = parts[0].trim();

  // Clean location string
  const cleanLoc = event.location
    .replace(/\s*\([-+]?\d+(\.\d+)?,\s*[-+]?\d+(\.\d+)?\)/g, "")
    .replace(/\s*\[.*?\]/g, "")
    .trim();

  const lat = event.coordinates?.latitude ? event.coordinates.latitude.toFixed(4) : null;
  const lon = event.coordinates?.longitude ? event.coordinates.longitude.toFixed(4) : null;
  const coords = lat && lon ? `LAT ${lat}, LON ${lon}` : null;

  return {
    title: primaryTitle || event.name,
    location: cleanLoc || event.location,
    province: event.province,
    coords,
  };
}

type SortColumn = "nama" | "status" | "eskalasi" | "warga" | "update";
type SortDirection = "asc" | "desc";

export function EventsTable({
  events,
}: {
  events: DisasterEvent[];
}) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedProvince, setSelectedProvince] = React.useState("semua");
  const [selectedStatus, setSelectedStatus] = React.useState("semua");
  const [selectedEscalation, setSelectedEscalation] = React.useState("semua");
  const [sortColumn, setSortColumn] = React.useState<SortColumn>("update");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  // Unique provinces for filter dropdown
  const provinces = React.useMemo(() => {
    const set = new Set(events.map((e) => e.province).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [events]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection(column === "warga" || column === "update" ? "desc" : "asc");
    }
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedProvince("semua");
    setSelectedStatus("semua");
    setSelectedEscalation("semua");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedProvince !== "semua" ||
    selectedStatus !== "semua" ||
    selectedEscalation !== "semua";

  // Filtered events
  const filteredEvents = React.useMemo(() => {
    return events.filter((event) => {
      // 1. Province filter
      if (selectedProvince !== "semua" && event.province !== selectedProvince) {
        return false;
      }

      // 2. Status filter
      if (selectedStatus !== "semua" && event.status !== selectedStatus) {
        return false;
      }

      // 3. Escalation filter
      if (selectedEscalation !== "semua" && event.escalationLevel !== selectedEscalation) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const parsed = parseHumanIncident(event);
        const match =
          parsed.title.toLowerCase().includes(q) ||
          event.name.toLowerCase().includes(q) ||
          event.location.toLowerCase().includes(q) ||
          event.province.toLowerCase().includes(q) ||
          event.id.toLowerCase().includes(q) ||
          event.type.toLowerCase().includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [events, selectedProvince, selectedStatus, selectedEscalation, searchQuery]);

  // Sorted events
  const sortedEvents = React.useMemo(() => {
    const list = [...filteredEvents];

    const statusPriority: Record<CrisisStatus, number> = {
      critical: 4,
      major: 3,
      warning: 2,
      safe: 1,
    };

    const escalationPriority: Record<DisasterEvent["escalationLevel"], number> = {
      Nasional: 3,
      Provinsi: 2,
      Kabupaten: 1,
    };

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "nama": {
          const nameA = parseHumanIncident(a).title;
          const nameB = parseHumanIncident(b).title;
          cmp = nameA.localeCompare(nameB, "id");
          break;
        }
        case "status":
          cmp = (statusPriority[a.status] || 0) - (statusPriority[b.status] || 0);
          break;
        case "eskalasi":
          cmp =
            (escalationPriority[a.escalationLevel] || 0) -
            (escalationPriority[b.escalationLevel] || 0);
          break;
        case "warga":
          cmp = a.affectedPeople - b.affectedPeople;
          break;
        case "update":
          cmp = (a.updatedAtIso || "").localeCompare(b.updatedAtIso || "");
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return list;
  }, [filteredEvents, sortColumn, sortDirection]);

  // Pagination calculation
  const totalRecords = sortedEvents.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const paginatedEvents = sortedEvents.slice(startIndex, endIndex);

  const renderSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="size-3 text-muted-foreground/40" aria-hidden="true" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="size-3 text-foreground font-semibold" aria-hidden="true" />
    ) : (
      <ArrowDown className="size-3 text-foreground font-semibold" aria-hidden="true" />
    );
  };

  return (
    <div className="flex flex-col">
      {/* ── Filter Toolbar ── */}
      <div className="flex flex-col gap-2.5 border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari kejadian, wilayah, kode..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 pl-8 pr-7 text-xs font-sans placeholder:text-muted-foreground/70"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Hapus pencarian"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Wilayah */}
            <Select
              value={selectedProvince}
              onValueChange={(val) => {
                setSelectedProvince(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-fit min-w-[130px] text-xs font-sans">
                <SelectValue placeholder="Semua Wilayah" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Wilayah</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Krisis */}
            <Select
              value={selectedStatus}
              onValueChange={(val) => {
                setSelectedStatus(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-fit min-w-[130px] text-xs font-sans">
                <SelectValue placeholder="Status Krisis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status</SelectItem>
                <SelectItem value="critical">Bahaya Tinggi</SelectItem>
                <SelectItem value="major">Terdampak Berat</SelectItem>
                <SelectItem value="warning">Perlu Waspada</SelectItem>
                <SelectItem value="safe">Relatif Aman</SelectItem>
              </SelectContent>
            </Select>

            {/* Tingkat Eskalasi */}
            <Select
              value={selectedEscalation}
              onValueChange={(val) => {
                setSelectedEscalation(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-fit min-w-[130px] text-xs font-sans">
                <SelectValue placeholder="Tingkat Eskalasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Eskalasi</SelectItem>
                <SelectItem value="Nasional">Tingkat Nasional</SelectItem>
                <SelectItem value="Provinsi">Tingkat Provinsi</SelectItem>
                <SelectItem value="Kabupaten">Tingkat Kabupaten</SelectItem>
              </SelectContent>
            </Select>

            {/* Reset Button */}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 px-2 text-xs font-sans text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table with Sticky Header ── */}
      <div className="relative overflow-x-auto max-h-[640px] [scrollbar-width:thin]">
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-card/98 backdrop-blur-md shadow-2xs border-b border-border/70">
            <TableRow className="hover:bg-transparent">
              {/* Nama Kejadian & Lokasi */}
              <TableHead className="font-sans text-xs font-semibold text-muted-foreground min-w-56 bg-card/98">
                <button
                  type="button"
                  onClick={() => handleSort("nama")}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                >
                  <span>Kejadian &amp; Lokasi</span>
                  {renderSortIndicator("nama")}
                </button>
              </TableHead>

              {/* Status Krisis (Danger condition) */}
              <TableHead className="font-sans text-xs font-semibold text-muted-foreground w-40 bg-card/98">
                <button
                  type="button"
                  onClick={() => handleSort("status")}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                >
                  <span>Status Krisis</span>
                  {renderSortIndicator("status")}
                </button>
              </TableHead>

              {/* Tingkat Eskalasi (Jurisdiction level) */}
              <TableHead className="font-sans text-xs font-semibold text-muted-foreground w-40 bg-card/98">
                <button
                  type="button"
                  onClick={() => handleSort("eskalasi")}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                >
                  <span>Tingkat Eskalasi</span>
                  {renderSortIndicator("eskalasi")}
                </button>
              </TableHead>

              {/* Warga Terdampak */}
              <TableHead className="font-sans text-xs font-semibold text-muted-foreground w-36 bg-card/98">
                <button
                  type="button"
                  onClick={() => handleSort("warga")}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                >
                  <span>Warga Terdampak</span>
                  {renderSortIndicator("warga")}
                </button>
              </TableHead>

              {/* Posko Aktif */}
              <TableHead className="font-sans text-xs font-semibold text-muted-foreground w-28 bg-card/98">
                <span>Posko Aktif</span>
              </TableHead>

              {/* Ruang Operasi Action */}
              <TableHead className="font-sans text-xs font-semibold text-muted-foreground text-right w-44 whitespace-nowrap bg-card/98">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEvents.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="py-12 text-center font-sans text-xs text-muted-foreground"
                >
                  {hasActiveFilters
                    ? "Tidak ada kejadian bencana yang cocok dengan kriteria filter."
                    : "Belum ada kejadian bencana aktif."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedEvents.map((event) => {
                const parsed = parseHumanIncident(event);

                return (
                  <TableRow
                    key={event.id}
                    className="group transition-colors duration-150 hover:bg-muted/50"
                  >
                    {/* 1. Nama Kejadian & Lokasi (No raw coords in main scan line!) */}
                    <TableCell className="align-top py-3 font-sans">
                      <Link
                        href={`/kejadian/${event.id}`}
                        className="font-heading font-semibold text-sm text-foreground hover:text-primary transition-colors block leading-snug"
                      >
                        {parsed.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground font-sans">
                        <span className="flex items-center gap-1 font-medium text-foreground/80">
                          <MapPin className="size-3 text-muted-foreground shrink-0" />
                          <span>{parsed.location}</span>
                          {parsed.province && <span>, {parsed.province}</span>}
                        </span>
                        {parsed.coords && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="inline-flex items-center rounded border border-border/50 bg-muted/60 px-1 py-0.2 font-mono text-[9.5px] text-muted-foreground/75 hover:text-foreground transition-colors cursor-help"
                                tabIndex={0}
                              >
                                GPS
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="font-mono text-xs">
                              {parsed.coords}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <span>·</span>
                        <span>Update {event.updatedAt}</span>
                      </div>
                    </TableCell>

                    {/* 2. Status Krisis (Danger condition) */}
                    <TableCell className="align-top py-3 font-sans">
                      <div className="flex flex-col gap-0.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-sans font-medium text-xs py-0.5 px-2.5 w-fit",
                            crisisBadgeStyles[event.status],
                          )}
                        >
                          {crisisLabels[event.status]}
                        </Badge>
                        <span className="font-sans text-[10.5px] text-muted-foreground/75 pl-0.5">
                          Kondisi kedaruratan
                        </span>
                      </div>
                    </TableCell>

                    {/* 3. Tingkat Eskalasi (Jurisdiction / Handling level) */}
                    <TableCell className="align-top py-3 font-sans">
                      <div className="flex flex-col gap-0.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1.5 font-sans font-medium text-xs py-0.5 px-2 w-fit",
                            escalationStyles[event.escalationLevel],
                          )}
                        >
                          <Building2 className="size-3 text-muted-foreground shrink-0" />
                          <span>{escalationLabels[event.escalationLevel]}</span>
                        </Badge>
                        <span className="font-sans text-[10.5px] text-muted-foreground/75 pl-0.5">
                          Yurisdiksi komando
                        </span>
                      </div>
                    </TableCell>

                    {/* 4. Warga Terdampak */}
                    <TableCell className="align-top py-3 font-sans">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground tabular-nums">
                        <Users className="size-3.5 text-muted-foreground shrink-0" />
                        <span>{event.affectedPeople.toLocaleString("id-ID")} Jiwa</span>
                      </div>
                      <span className="font-sans text-[10.5px] text-muted-foreground/75">
                        Estimasi terdampak
                      </span>
                    </TableCell>

                    {/* 5. Posko Aktif */}
                    <TableCell className="align-top py-3 font-sans">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground tabular-nums">
                        <Home className="size-3.5 text-muted-foreground shrink-0" />
                        <span>{event.activeShelters} Posko</span>
                      </div>
                      <span className="font-sans text-[10.5px] text-muted-foreground/75">
                        Terverifikasi
                      </span>
                    </TableCell>

                    {/* 6. Aksi: Satu Aksi Bersih "Buka Ruang Kendali" */}
                    <TableCell className="text-right align-top py-3 whitespace-nowrap font-sans">
                      <Button
                        asChild
                        size="sm"
                        variant="default"
                        className="h-8 gap-1.5 text-xs font-sans font-medium shadow-2xs"
                      >
                        <Link href={`/kejadian/${event.id}`}>
                          <span>Buka Ruang Kendali</span>
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Built-in Pagination Controls ── */}
      {totalRecords > 0 && (
        <div
          className={cn(
            "flex flex-col gap-2.5 border-t font-sans sm:flex-row sm:items-center sm:justify-between transition-colors",
            totalPages <= 1
              ? "border-border/40 bg-muted/5 px-4 py-2 sm:px-5"
              : "border-border/60 bg-muted/15 px-4 py-3 sm:px-5",
          )}
        >
          {/* Rows per page & Range text */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-[11px]">Baris per halaman:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-[68px] text-xs font-sans">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="tabular-nums text-[11px]">
              Menampilkan <strong className="font-medium text-foreground">{startIndex + 1}</strong>–
              <strong className="font-medium text-foreground">{endIndex}</strong> dari{" "}
              <strong className="font-medium text-foreground">{totalRecords}</strong> kejadian
            </span>
          </div>

          {/* Navigation Buttons */}
          <div
            className={cn(
              "flex items-center gap-1.5 self-end sm:self-auto",
              totalPages <= 1 && "opacity-40 pointer-events-none select-none",
            )}
          >
            {/* First Page */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="size-7 p-0"
              aria-label="Halaman pertama"
            >
              <ChevronsLeft className="size-3.5" />
            </Button>

            {/* Previous Page */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 gap-1 px-2 text-xs font-sans"
            >
              <ChevronLeft className="size-3.5" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </Button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  return p === 1 || p === totalPages || Math.abs(p - validPage) <= 1;
                })
                .map((p, index, array) => {
                  const prev = array[index - 1];
                  const hasGap = prev && p - prev > 1;

                  return (
                    <React.Fragment key={p}>
                      {hasGap && <span className="px-1 text-xs text-muted-foreground">...</span>}
                      <Button
                        type="button"
                        size="sm"
                        variant={validPage === p ? "default" : "ghost"}
                        onClick={() => setCurrentPage(p)}
                        className={cn(
                          "size-7 p-0 font-sans text-xs font-medium tabular-nums",
                          validPage === p
                            ? "bg-primary text-primary-foreground shadow-2xs"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {p}
                      </Button>
                    </React.Fragment>
                  );
                })}
            </div>

            {/* Next Page */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 gap-1 px-2 text-xs font-sans"
            >
              <span className="hidden sm:inline">Berikutnya</span>
              <ChevronRight className="size-3.5" />
            </Button>

            {/* Last Page */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="size-7 p-0"
              aria-label="Halaman terakhir"
            >
              <ChevronsRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
