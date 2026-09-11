"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  PhoneCall,
  Radio,
  Smartphone,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableFeatures } from "@/lib/data-table-features";

import type { RecentReportRow } from "./schema";

function urgencyBadge(urgency: RecentReportRow["urgency"]) {
  switch (urgency) {
    case "Darurat":
      return (
        <Badge
          variant="destructive"
          className="h-6 gap-1 rounded-md px-2 text-[11px] font-semibold"
        >
          <AlertCircle className="size-3" />
          Darurat
        </Badge>
      );
    case "Mendesak":
      return (
        <Badge className="h-6 gap-1 rounded-md bg-amber-600 px-2 text-[11px] font-medium text-white dark:bg-amber-500 dark:text-amber-950">
          <AlertTriangle className="size-3" />
          Mendesak
        </Badge>
      );
    case "Waspada":
      return (
        <Badge
          variant="outline"
          className="h-6 gap-1 rounded-md border-blue-400/60 px-2 text-[11px] text-blue-700 dark:text-blue-400"
        >
          <Clock className="size-3" />
          Waspada
        </Badge>
      );
    case "Terkendali":
      return (
        <Badge
          variant="outline"
          className="h-6 gap-1 rounded-md border-emerald-500/50 px-2 text-[11px] text-emerald-700 dark:text-emerald-400"
        >
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
        <Badge
          variant="outline"
          className="h-6 gap-1 rounded-md px-2 text-[11px] text-foreground"
        >
          <Smartphone className="size-3" />
          SMS Zero-Grid
        </Badge>
      );
    case "Radio Lapangan":
      return (
        <Badge
          variant="outline"
          className="h-6 gap-1 rounded-md px-2 text-[11px] text-foreground"
        >
          <Radio className="size-3" />
          Radio Lapangan
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="h-6 gap-1 rounded-md px-2 text-[11px] text-muted-foreground"
        >
          Web App
        </Badge>
      );
  }
}

function statusBadge(status: RecentReportRow["status"]) {
  const tone: Record<RecentReportRow["status"], string> = {
    Baru: "border-purple-300 bg-purple-50 text-purple-900 dark:border-purple-500/40 dark:bg-purple-500/15 dark:text-purple-200",
    "Perlu Verifikasi":
      "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
    Diverifikasi:
      "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200",
    Ditindaklanjuti:
      "border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-500/40 dark:bg-teal-500/15 dark:text-teal-200",
    "Dibuka Jadi Kejadian":
      "border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
    Duplikat:
      "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300",
    Ditolak:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300",
  };

  return (
    <Badge
      variant="outline"
      className={`h-6 rounded-md px-2 text-[11px] font-medium ${tone[status] || ""}`}
    >
      {status}
    </Badge>
  );
}

export const recentReportsColumns: ColumnDef<
  DataTableFeatures,
  RecentReportRow
>[] = [
  {
    accessorKey: "reporterName",
    header: "Pelapor & Lokasi",
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          <User className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold text-xs text-foreground">
            {row.original.reporterName}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {row.original.location} · #{row.original.id}
          </div>
        </div>
      </div>
    ),
    filterFn: (row, _columnId, value: string) => {
      const query = value.toLocaleLowerCase("id-ID");
      return [
        row.original.reporterName,
        row.original.location,
        row.original.id,
        row.original.disasterType,
      ].some((field) => field.toLocaleLowerCase("id-ID").includes(query));
    },
    enableHiding: false,
  },
  {
    accessorKey: "disasterType",
    header: "Jenis/Ringkasan Kejadian",
    cell: ({ row }) => (
      <div className="space-y-1">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">
          {row.original.disasterType}
        </p>
        {(row.original.coordinates || row.original.phone) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-muted-foreground">
            {row.original.coordinates && (
              <span
                className="inline-flex items-center gap-1 rounded border border-border/50 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/90"
                title={`Koordinat GPS: ${row.original.coordinates}`}
              >
                <MapPin className="size-2.5 shrink-0 text-muted-foreground" />
                {row.original.coordinates}
              </span>
            )}
            {row.original.phone && (
              <span
                className="inline-flex items-center gap-1 rounded border border-border/50 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/90"
                title={`Kontak: ${row.original.phone}`}
              >
                <PhoneCall className="size-2.5 shrink-0 text-muted-foreground" />
                {row.original.phone}
              </span>
            )}
          </div>
        )}
      </div>
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
    header: "Status",
    filterFn: "equalsString",
    cell: ({ row }) => statusBadge(row.original.status),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Aksi</div>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 text-xs"
          asChild
        >
          <Link
            href="/laporan"
            aria-label={`Tinjau laporan ${row.original.id}`}
          >
            Tinjau
          </Link>
        </Button>
      </div>
    ),
    enableHiding: false,
  },
];
