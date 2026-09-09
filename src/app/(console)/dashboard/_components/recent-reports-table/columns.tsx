"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Smartphone,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { DataTableFeatures } from "@/lib/data-table-features";

import type { RecentReportRow } from "./schema";

function urgencyBadge(urgency: RecentReportRow["urgency"]) {
  switch (urgency) {
    case "Darurat":
      return (
        <Badge variant="destructive" className="gap-1 font-bold animate-pulse">
          <AlertCircle className="size-3" />
          Darurat
        </Badge>
      );
    case "Mendesak":
      return (
        <Badge className="gap-1 bg-amber-600 text-white dark:bg-amber-500 font-medium">
          <AlertTriangle className="size-3" />
          Mendesak
        </Badge>
      );
    case "Waspada":
      return (
        <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300 dark:border-blue-700">
          <Clock className="size-3" />
          Waspada
        </Badge>
      );
    case "Terkendali":
      return (
        <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300 dark:border-emerald-700">
          <CheckCircle2 className="size-3" />
          Terkendali
        </Badge>
      );
  }
}

function channelBadge(channel: RecentReportRow["channel"]) {
  switch (channel) {
    case "SMS Zero-Grid":
      return (
        <Badge variant="outline" className="gap-1 border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
          <Smartphone className="size-3" />
          SMS Zero-Grid
        </Badge>
      );
    case "Radio Lapangan":
      return (
        <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <Radio className="size-3" />
          Radio Lapangan
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          Web App
        </Badge>
      );
  }
}

export const recentReportsColumns: ColumnDef<DataTableFeatures, RecentReportRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Pilih semua baris"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Pilih baris laporan"
        />
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "reporterName",
    header: "Pelapor & Lokasi",
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg border bg-muted text-muted-foreground shrink-0">
          <User className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-xs text-foreground truncate">
            {row.original.reporterName}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {row.original.location} · #{row.original.id}
          </div>
        </div>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "disasterType",
    header: "Jenis Kejadian",
    cell: ({ row }) => (
      <span className="text-xs font-medium text-foreground">
        {row.original.disasterType}
      </span>
    ),
  },
  {
    accessorKey: "urgency",
    header: "Urgensi",
    filterFn: "equalsString",
    cell: ({ row }) => urgencyBadge(row.original.urgency),
  },
  {
    accessorKey: "channel",
    header: "Saluran",
    filterFn: "equalsString",
    cell: ({ row }) => channelBadge(row.original.channel),
  },
  {
    accessorKey: "status",
    header: "Status Penanganan",
    filterFn: "equalsString",
    cell: ({ row }) => {
      const isPending = row.original.status === "Belum Diverifikasi";
      return (
        <Badge
          variant="outline"
          className={
            isPending
              ? "border-red-300 text-red-600 dark:border-red-800 dark:text-red-400 font-semibold"
              : "text-muted-foreground"
          }
        >
          {row.original.status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Waktu Lapor",
    cell: ({ row }) => {
      const date = parseISO(row.original.createdAt);
      return (
        <div className="text-xs text-muted-foreground tabular-nums">
          <div>{format(date, "d MMM yyyy")}</div>
          <div className="text-[10px] text-muted-foreground/70">{format(date, "HH:mm 'WIB'")}</div>
        </div>
      );
    },
  },
];
