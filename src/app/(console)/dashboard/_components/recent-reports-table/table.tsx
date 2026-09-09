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
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
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
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility] = React.useState<ColumnVisibilityState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns: recentReportsColumns,
    state: {
      rowSelection,
      columnFilters,
      sorting,
      columnVisibility,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
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

  const urgencyFilter = (table.getColumn("urgency")?.getFilterValue() as string | undefined) ?? "all";
  const channelFilter = (table.getColumn("channel")?.getFilterValue() as string | undefined) ?? "all";
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string | undefined) ?? "all";

  return (
    <div className="space-y-4">
      {/* Filters & Actions Bar */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 rounded-lg pl-8 text-xs"
              placeholder="Cari nama pelapor / lokasi..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <SlidersHorizontal className="size-3.5" />
                Urgensi: {urgencyFilter === "all" ? "Semua" : urgencyFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44" align="start">
              <DropdownMenuRadioGroup
                value={urgencyFilter}
                onValueChange={(val) => {
                  table.getColumn("urgency")?.setFilterValue(val === "all" ? undefined : val);
                  table.setPageIndex(0);
                }}
              >
                {urgencyOptions.map((opt) => (
                  <DropdownMenuRadioItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Filter className="size-3.5" />
                Status: {statusFilter === "all" ? "Semua" : statusFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44" align="start">
              <DropdownMenuRadioGroup
                value={statusFilter}
                onValueChange={(val) => {
                  table.getColumn("status")?.setFilterValue(val === "all" ? undefined : val);
                  table.setPageIndex(0);
                }}
              >
                {statusOptions.map((opt) => (
                  <DropdownMenuRadioItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="text-xs text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} dari{" "}
          {table.getFilteredRowModel().rows.length} baris terpilih
        </div>
      </div>

      {/* Table Surface */}
      <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/30">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan} className="h-10 px-3 text-xs font-semibold">
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={table.state.rowSelection[row.id] && "selected"}
                  className="hover:bg-muted/40 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="p-3 align-middle text-xs">
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={recentReportsColumns.length} className="h-24 text-center text-xs text-muted-foreground">
                  Tidak ada laporan bencana ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="hidden flex-1 text-muted-foreground text-xs lg:flex">
          Halaman {table.state.pagination.pageIndex + 1} dari {table.getPageCount() || 1}
        </div>
        <div className="flex w-full items-center gap-6 lg:w-fit">
          <div className="flex items-center gap-2">
            <Label htmlFor="rows-per-page" className="font-medium text-xs">
              Baris per halaman
            </Label>
            <Select
              value={`${table.state.pagination.pageSize}`}
              onValueChange={(val) => table.setPageSize(Number(val))}
            >
              <SelectTrigger size="sm" className="w-16 h-7 text-xs" id="rows-per-page">
                <SelectValue placeholder={table.state.pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {[5, 10, 20].map((size) => (
                    <SelectItem key={size} value={`${size}`} className="text-xs">
                      {size}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
            <Button
              variant="outline"
              className="size-7 p-0"
              size="icon"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              className="size-7 p-0"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              className="size-7 p-0"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              className="size-7 p-0"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
