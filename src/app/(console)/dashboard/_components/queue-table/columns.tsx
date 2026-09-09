"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { ConfirmMutationAction } from "@/components/confirm-mutation-action";
import { MutationAction } from "@/components/mutation-action";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { openEventFromReport, verifyFieldReport } from "@/lib/actions/operations";
import type { DataTableFeatures } from "@/lib/data-table-features";
import type { ShelterNeed } from "@/lib/dashboard-metrics";
import type { AuditLogItem } from "@/lib/repositories/audit";
import type { Distribution, FieldReport } from "@/lib/types";

type SortableHeaderProps = {
  label: string;
  canSort: boolean;
  sorted: false | "asc" | "desc";
  onToggle: () => void;
};

function SortableHeader({ label, canSort, sorted, onToggle }: SortableHeaderProps) {
  if (!canSort) return <span>{label}</span>;

  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown;

  return (
    <Button variant="ghost" size="sm" className="-ml-2 h-8 gap-1.5 px-2" onClick={onToggle}>
      {label}
      <Icon className="size-3.5 opacity-70" aria-hidden="true" />
    </Button>
  );
}

const reportStatusLabels: Record<FieldReport["status"], string> = {
  baru: "Baru",
  diverifikasi: "Diverifikasi",
  ditindaklanjuti: "Ditindaklanjuti",
  ditolak: "Ditolak / Duplikat",
};

const distributionStatusLabels: Record<Distribution["status"], string> = {
  disiapkan: "Disiapkan",
  "dalam-perjalanan": "Dalam perjalanan",
  diterima: "Diterima",
};

export const REPORT_COLUMN_LABELS: Record<string, string> = {
  id: "ID & lokasi",
  channel: "Kanal",
  summary: "Ringkasan",
  status: "Status",
  receivedAtIso: "Waktu laporan",
};

export const NEED_COLUMN_LABELS: Record<string, string> = {
  item: "Kebutuhan",
  shelterName: "Posko",
  category: "Kategori",
  shortage: "Kekurangan",
  urgency: "Urgensi",
};

export const DISTRIBUTION_COLUMN_LABELS: Record<string, string> = {
  id: "ID distribusi",
  cargo: "Muatan",
  destination: "Tujuan",
  eta: "ETA",
  status: "Status",
};

export const AUDIT_COLUMN_LABELS: Record<string, string> = {
  createdAtIso: "Waktu",
  action: "Aksi",
  actorName: "Actor",
  targetTable: "Target",
  afterSummary: "Ringkasan perubahan",
};

export function reportColumns({
  canVerifyReport,
  canOpenIncident,
}: {
  canVerifyReport: boolean;
  canOpenIncident: boolean;
}): ColumnDef<DataTableFeatures, FieldReport>[] {
  const columns: ColumnDef<DataTableFeatures, FieldReport>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <SortableHeader
          label={REPORT_COLUMN_LABELS.id}
          canSort={column.getCanSort()}
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => (
        <div className="min-w-40">
          <p className="font-medium">{row.original.id}</p>
          <p className="mt-1 text-xs text-muted-foreground">{row.original.location}</p>
        </div>
      ),
    },
    {
      accessorKey: "channel",
      header: REPORT_COLUMN_LABELS.channel,
      cell: ({ row }) => (
        <Badge variant={row.original.channel === "SMS Zero-Grid" ? "secondary" : "outline"}>
          {row.original.channel}
        </Badge>
      ),
    },
    {
      accessorKey: "summary",
      header: REPORT_COLUMN_LABELS.summary,
      cell: ({ row }) => (
        <div className="min-w-56 max-w-sm">
          <p className="line-clamp-2 text-sm leading-6">{row.original.summary}</p>
          <StatusBadge status={row.original.severity} className="mt-2 w-fit" />
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: REPORT_COLUMN_LABELS.status,
      cell: ({ row }) => <Badge variant="outline">{reportStatusLabels[row.original.status]}</Badge>,
    },
    {
      id: "receivedAtIso",
      accessorFn: (row) => new Date(row.receivedAtIso).getTime(),
      sortFn: "alphanumeric",
      header: ({ column }) => (
        <SortableHeader
          label={REPORT_COLUMN_LABELS.receivedAtIso}
          canSort={column.getCanSort()}
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.receivedAt}</span>,
      enableGlobalFilter: false,
    },
  ];

  if (canVerifyReport || canOpenIncident) {
    columns.push({
      id: "actions",
      header: "Aksi",
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex min-w-44 flex-wrap gap-2">
          {canVerifyReport && row.original.status !== "ditolak" ? (
            <MutationAction
              action={verifyFieldReport}
              label={row.original.status === "baru" ? "Verifikasi" : "Tindak lanjut"}
              fields={{ code: row.original.id }}
              variant={row.original.status === "baru" ? "outline" : "secondary"}
            />
          ) : null}
          {canOpenIncident && row.original.status !== "baru" && row.original.status !== "ditolak" ? (
            <ConfirmMutationAction
              action={openEventFromReport}
              label="Buka kejadian"
              title={`Buka kejadian dari ${row.original.id}?`}
              description={`Laporan ${row.original.location} akan menjadi kejadian aktif baru bila belum terhubung ke kejadian lain.`}
              consequence="Sistem membuat kejadian baru, menghubungkan laporan, dan mencatat keputusan operator di audit log."
              fields={{ code: row.original.id, name: `Kejadian ${row.original.location}` }}
            />
          ) : null}
        </div>
      ),
    });
  }

  return columns;
}

export function needColumns(): ColumnDef<DataTableFeatures, ShelterNeed>[] {
  return [
    {
      accessorKey: "item",
      header: ({ column }) => (
        <SortableHeader
          label={NEED_COLUMN_LABELS.item}
          canSort={column.getCanSort()}
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => <p className="min-w-36 font-medium">{row.original.item}</p>,
    },
    {
      accessorKey: "shelterName",
      header: NEED_COLUMN_LABELS.shelterName,
      cell: ({ row }) => <span className="text-sm">{row.original.shelterName}</span>,
    },
    {
      accessorKey: "category",
      header: NEED_COLUMN_LABELS.category,
      cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
    },
    {
      id: "shortage",
      accessorFn: (row) => Math.max(row.requested - row.available, 0),
      sortFn: "alphanumeric",
      header: ({ column }) => (
        <SortableHeader
          label={NEED_COLUMN_LABELS.shortage}
          canSort={column.getCanSort()}
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() !== "desc")}
        />
      ),
      cell: ({ row }) => (
        <span className="data-number text-sm font-semibold tabular-nums">
          {Math.max(row.original.requested - row.original.available, 0).toLocaleString("id-ID")} {row.original.unit}
        </span>
      ),
      enableGlobalFilter: false,
    },
    {
      accessorKey: "urgency",
      header: NEED_COLUMN_LABELS.urgency,
      cell: ({ row }) => <StatusBadge status={row.original.urgency} />,
    },
    {
      id: "actions",
      header: "Aksi",
      enableHiding: false,
      cell: () => (
        <Button asChild variant="outline" size="sm">
          <Link href="/logistik">Alokasi</Link>
        </Button>
      ),
    },
  ];
}

export function distributionColumns(): ColumnDef<DataTableFeatures, Distribution>[] {
  return [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <SortableHeader
          label={DISTRIBUTION_COLUMN_LABELS.id}
          canSort={column.getCanSort()}
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => <p className="min-w-32 font-medium">{row.original.id}</p>,
    },
    {
      accessorKey: "cargo",
      header: DISTRIBUTION_COLUMN_LABELS.cargo,
      cell: ({ row }) => (
        <div className="min-w-40">
          <p className="text-sm font-medium">{row.original.cargo}</p>
          <p className="mt-1 text-xs text-muted-foreground">{row.original.origin}</p>
        </div>
      ),
    },
    {
      accessorKey: "destination",
      header: DISTRIBUTION_COLUMN_LABELS.destination,
      cell: ({ row }) => <span className="text-sm">{row.original.destination}</span>,
    },
    {
      accessorKey: "eta",
      header: DISTRIBUTION_COLUMN_LABELS.eta,
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.eta}</span>,
    },
    {
      accessorKey: "status",
      header: DISTRIBUTION_COLUMN_LABELS.status,
      cell: ({ row }) => (
        <div className="min-w-32">
          <Badge variant={row.original.status === "diterima" ? "secondary" : "outline"}>
            {distributionStatusLabels[row.original.status]}
          </Badge>
          <p className="mt-1 text-xs text-muted-foreground">{row.original.progress}% perjalanan</p>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      enableHiding: false,
      cell: () => (
        <Button asChild variant="outline" size="sm">
          <Link href="/logistik">Kelola</Link>
        </Button>
      ),
    },
  ];
}

export function auditColumns(): ColumnDef<DataTableFeatures, AuditLogItem>[] {
  return [
    {
      id: "createdAtIso",
      accessorFn: (row) => new Date(row.createdAtIso).getTime(),
      sortFn: "alphanumeric",
      header: ({ column }) => (
        <SortableHeader
          label={AUDIT_COLUMN_LABELS.createdAtIso}
          canSort={column.getCanSort()}
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() !== "desc")}
        />
      ),
      cell: ({ row }) => <span className="min-w-32 text-xs text-muted-foreground">{row.original.createdAt}</span>,
      enableGlobalFilter: false,
    },
    {
      accessorKey: "action",
      header: AUDIT_COLUMN_LABELS.action,
      cell: ({ row }) => <Badge variant="outline">{row.original.action}</Badge>,
    },
    {
      accessorKey: "actorName",
      header: AUDIT_COLUMN_LABELS.actorName,
      cell: ({ row }) => (
        <div className="min-w-36">
          <p className="text-sm font-medium">{row.original.actorName}</p>
          <p className="mt-1 text-xs text-muted-foreground">{row.original.actorRole}</p>
        </div>
      ),
    },
    {
      accessorKey: "targetTable",
      header: AUDIT_COLUMN_LABELS.targetTable,
      cell: ({ row }) => <span className="text-sm">{row.original.targetTable}</span>,
    },
    {
      accessorKey: "afterSummary",
      header: AUDIT_COLUMN_LABELS.afterSummary,
      cell: ({ row }) => (
        <div className="min-w-56 max-w-md">
          <p className="line-clamp-2 text-sm leading-6">{row.original.afterSummary}</p>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">Sebelum: {row.original.beforeSummary}</p>
        </div>
      ),
    },
  ];
}
