"use client";

import * as React from "react";
import {
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Radio,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
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
import { dataTableFeatures } from "@/lib/data-table-features";

import { recentReportsColumns } from "./columns";
import type { RecentReportRow } from "./schema";

const urgencyOptions = [
  { value: "all", label: "Semua Urgensi" },
  { value: "Darurat", label: "Darurat" },
  { value: "Mendesak", label: "Mendesak" },
  { value: "Waspada", label: "Waspada" },
  { value: "Terkendali", label: "Terkendali" },
] as const;

const channelOptions = [
  { value: "all", label: "Semua Saluran" },
  { value: "SMS Zero-Grid", label: "SMS Zero-Grid" },
  { value: "Radio Lapangan", label: "Radio Lapangan" },
  { value: "Web App", label: "Web App" },
] as const;

const statusOptions = [
  { value: "all", label: "Semua Status" },
  { value: "Belum Diverifikasi", label: "Belum Diverifikasi" },
  { value: "Diverifikasi", label: "Diverifikasi" },
  { value: "Ditangani", label: "Ditangani" },
  { value: "Selesai", label: "Selesai" },
] as const;

export function RecentReportsTable({ data }: { data: RecentReportRow[] }) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility] = React.useState<ColumnVisibilityState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns: recentReportsColumns,
    state: {
      columnFilters,
      sorting,
      columnVisibility,
      pagination,
    },
    getRowId: (row) => row.id,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  });

  const [searchQuery, setSearchQuery] = React.useState("");

  const onSearchChange = (value: string) => {
    setSearchQuery(value);
    table.getColumn("reporterName")?.setFilterValue(value || undefined);
    table.setPageIndex(0);
  };

  const urgencyFilter =
    (table.getColumn("urgency")?.getFilterValue() as string | undefined) ??
    "all";
  const channelFilter =
    (table.getColumn("channel")?.getFilterValue() as string | undefined) ??
    "all";
  const statusFilter =
    (table.getColumn("status")?.getFilterValue() as string | undefined) ??
    "all";
  const filteredCount = table.getFilteredRowModel().rows.length;

  const pageIndex = pagination.pageIndex;
  const pageSize = pagination.pageSize;
  const startRecord = filteredCount === 0 ? 0 : pageIndex * pageSize + 1;
  const endRecord = Math.min((pageIndex + 1) * pageSize, filteredCount);

  return (
    <div className="space-y-4 font-sans">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 rounded-lg pl-8 text-xs font-sans sm:h-8"
              placeholder="Cari nama pelapor / lokasi..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-11 gap-1.5 text-xs font-sans sm:h-8"
              >
                <SlidersHorizontal className="size-3.5" />
                Urgensi: {urgencyFilter === "all" ? "Semua" : urgencyFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44" align="start">
              <DropdownMenuRadioGroup
                value={urgencyFilter}
                onValueChange={(val) => {
                  table
                    .getColumn("urgency")
                    ?.setFilterValue(val === "all" ? undefined : val);
                  table.setPageIndex(0);
                }}
              >
                {urgencyOptions.map((opt) => (
                  <DropdownMenuRadioItem
                    key={opt.value}
                    value={opt.value}
                    className="text-xs font-sans"
                  >
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-11 gap-1.5 text-xs font-sans sm:h-8"
              >
                <Radio className="size-3.5" />
                Saluran: {channelFilter === "all" ? "Semua" : channelFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44" align="start">
              <DropdownMenuRadioGroup
                value={channelFilter}
                onValueChange={(value) => {
                  table
                    .getColumn("channel")
                    ?.setFilterValue(value === "all" ? undefined : value);
                  table.setPageIndex(0);
                }}
              >
                {channelOptions.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value}
                    className="text-xs font-sans"
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-11 gap-1.5 text-xs font-sans sm:h-8"
              >
                <Filter className="size-3.5" />
                Status: {statusFilter === "all" ? "Semua" : statusFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44" align="start">
              <DropdownMenuRadioGroup
                value={statusFilter}
                onValueChange={(val) => {
                  table
                    .getColumn("status")
                    ?.setFilterValue(val === "all" ? undefined : val);
                  table.setPageIndex(0);
                }}
              >
                {statusOptions.map((opt) => (
                  <DropdownMenuRadioItem
                    key={opt.value}
                    value={opt.value}
                    className="text-xs font-sans"
                  >
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="text-xs text-muted-foreground" aria-live="polite">
          {filteredCount} laporan ditampilkan
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table className="w-full">
          <TableHeader className="bg-muted/30">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const id = header.column.id;
                  let colClass =
                    "h-9 px-3 text-xs font-semibold whitespace-nowrap";
                  if (id === "reporterName") colClass += " w-[220px]";
                  else if (id === "disasterType") colClass += " min-w-[240px]";
                  else if (id === "urgency") colClass += " w-[110px]";
                  else if (id === "channel") colClass += " w-[130px]";
                  else if (id === "status") colClass += " w-[125px]";
                  else if (id === "actions") colClass += " w-[75px] text-right";

                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={colClass}
                    >
                      {header.isPlaceholder ? null : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="transition-colors hover:bg-muted/40"
                >
                  {row.getVisibleCells().map((cell) => {
                    const id = cell.column.id;
                    let cellClass = "px-3 py-2.5 align-middle text-xs";
                    if (id !== "disasterType" && id !== "reporterName") {
                      cellClass += " whitespace-nowrap";
                    }
                    return (
                      <TableCell key={cell.id} className={cellClass}>
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={recentReportsColumns.length}
                  className="h-24 text-center text-xs text-muted-foreground"
                >
                  {data.length === 0
                    ? "Belum ada laporan yang masuk."
                    : "Tidak ada laporan yang sesuai dengan pencarian atau filter."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground font-sans">
          {filteredCount === 0
            ? "Menampilkan 0 laporan"
            : `Menampilkan ${startRecord}–${endRecord} dari ${filteredCount} laporan`}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end sm:gap-6">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="rows-per-page"
              className="text-xs font-medium text-muted-foreground font-sans"
            >
              Baris per halaman
            </Label>
            <Select
              value={`${table.state.pagination.pageSize}`}
              onValueChange={(val) => {
                table.setPageSize(Number(val));
                table.setPageIndex(0);
              }}
            >
              <SelectTrigger
                size="sm"
                className="h-8 w-18 text-xs font-sans"
                id="rows-per-page"
              >
                <SelectValue placeholder={table.state.pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {[10, 25, 50, 100].map((size) => (
                    <SelectItem
                      key={size}
                      value={`${size}`}
                      className="text-xs font-sans"
                    >
                      {size}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-sans">
              Halaman {table.state.pagination.pageIndex + 1} dari{" "}
              {table.getPageCount() || 1}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                className="size-8 p-0"
                size="icon"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                aria-label="Ke halaman pertama"
              >
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                className="size-8 p-0"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Ke halaman sebelumnya"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                className="size-8 p-0"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Ke halaman berikutnya"
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                className="size-8 p-0"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                aria-label="Ke halaman terakhir"
              >
                <ChevronsRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
