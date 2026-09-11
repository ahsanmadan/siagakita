"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  FileClock,
  FilePlus2,
  PackageCheck,
  Route,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { AuditLogItem } from "@/lib/repositories/audit";
import { cn } from "@/lib/utils";

// ── Action Human Dictionary ──────────────────────────────────────────
const actionDictionary: Record<string, { label: string; description?: string }> = {
  // Kejadian & Bencana
  "event.escalated": { label: "Eskalasi status bencana", description: "Peningkatan level kegawatan kejadian" },
  "event.opened_from_report": { label: "Buka kejadian baru", description: "Membuka status tanggap darurat dari laporan" },

  // Laporan Lapangan & AI
  "report.created": { label: "Laporan warga masuk", description: "Laporan situasi baru dibuat" },
  "report.needs_verification": { label: "Laporan ditandai perlu verifikasi", description: "Laporan membutuhkan konfirmasi validasi lanjutan" },
  "report.verified": { label: "Laporan diverifikasi", description: "Laporan dikonfirmasi kebenarannya oleh petugas" },
  "report.followed_up": { label: "Laporan ditindaklanjuti", description: "Laporan masuk respon penanganan operasional" },
  "report.marked_duplicate": { label: "Laporan ditandai duplikat", description: "Laporan diidentifikasi sebagai duplikasi kejadian serupa" },
  "report.rejected": { label: "Laporan ditolak", description: "Laporan dinyatakan tidak valid atau fiktif saat triase" },
  "report.converted_to_event": { label: "Laporan dibuka jadi kejadian", description: "Laporan resmi dijadikan kejadian bencana aktif" },
  "report.ai_triaged_groq": { label: "Triase otomatis AI", description: "Klasifikasi kedaruratan otomatis oleh AI" },

  // SMS Zero-Grid Workflow
  "sms.received_and_parsed": { label: "SMS darurat masuk & diekstraksi", description: "Pesan SMS lapangan diterima dan diekstraksi" },
  "sms.accepted": { label: "SMS darurat diterima", description: "Pesan SMS disetujui menjadi laporan lapangan resmi" },
  "sms.edited_and_accepted": { label: "SMS diedit & disetujui", description: "Pesan SMS diperbaiki operator lalu disetujui" },
  "sms.rejected": { label: "SMS darurat ditolak", description: "Pesan SMS dinyatakan tidak relevan atau dibatalkan" },
  "sms.marked_duplicate": { label: "SMS ditandai duplikat", description: "Pesan SMS diidentifikasi duplikasi informasi serupa" },

  // Pengajuan & Alokasi Bantuan
  "aid_request.submitted": { label: "Pengajuan bantuan posko", description: "Posko mengajukan permintaan logistik baru" },
  "aid_request.reviewed": { label: "Pengajuan bantuan ditinjau", description: "Operator/gudang meninjau permintaan bantuan" },
  "aid_request.rejected": { label: "Pengajuan bantuan ditolak", description: "Permintaan bantuan posko ditolak" },
  "aid_request.allocated": { label: "Bantuan posko dialokasikan", description: "Permintaan bantuan dipenuhi dari stok gudang" },
  "aid_request.partially_fulfilled": { label: "Bantuan sebagian dialokasikan", description: "Sebagian barang bantuan dialokasikan" },
  "aid_request.fulfilled": { label: "Bantuan posko terpenuhi", description: "Seluruh kebutuhan posko selesai diserahkan" },
  "aid_allocation.created": { label: "Alokasi stok dicatat", description: "Pencatatan alokasi logistik gudang ke posko" },
  "aid_allocation.delivered": { label: "Alokasi bantuan diterima posko", description: "Konfirmasi barang alokasi tiba di posko" },

  // Posko Pengungsian
  "shelter.created": { label: "Posko didaftarkan", description: "Registrasi posko baru" },
  "shelter.population_updated": { label: "Populasi posko diperbarui", description: "Pembaruan jumlah pengungsi posko" },
  "need.requested": { label: "Kebutuhan posko diajukan", description: "Permintaan kebutuhan logistik posko" },

  // Logistik & Armada Distribusi
  "distribution.allocated": { label: "Alokasi logistik disetujui", description: "Penyaluran stok dari gudang logistik disetujui" },
  "distribution.created": { label: "Distribusi armada dibuat", description: "Penerbitan surat jalan armada" },
  "distribution.vehicle_assigned": { label: "Armada & pengemudi ditugaskan", description: "Penugasan kendaraan dan supir armada ke pengiriman" },
  "distribution.location_updated": { label: "Lokasi terakhir diperbarui", description: "Pembaruan manual titik lokasi terakhir oleh pengemudi/petugas" },
  "distribution.checkpoint_updated": { label: "Lokasi terakhir diperbarui", description: "Pembaruan titik singgah pengiriman armada" },
  "distribution.delayed": { label: "Pengiriman tertunda", description: "Pencatatan kendala atau penundaan armada di perjalanan" },
  "distribution.arrived": { label: "Armada tiba di posko", description: "Kendaraan distribusi sampai di lokasi posko tujuan" },
  "distribution.status_updated": { label: "Status distribusi diperbarui", description: "Perubahan tahapan pengiriman bantuan" },
  "distribution.received": { label: "Bantuan diterima di posko", description: "Konfirmasi serah terima barang di posko" },

  // Bantuan Pihak Ketiga
  "third_party_aid.created": { label: "Bantuan eksternal dicatat", description: "Pencatatan donasi bantuan dari lembaga luar" },
  "third_party_aid.received_at_warehouse": { label: "Bantuan diterima gudang", description: "Logistik eksternal masuk gudang penyangga" },
  "third_party_aid.allocated": { label: "Bantuan eksternal dialokasikan", description: "Penyaluran bantuan eksternal ke posko" },

  // Rekomendasi & Akun
  "recommendation.reviewed": { label: "Rekomendasi AI ditinjau", description: "Review keputusan atas saran tindakan AI" },
  "ai_recommendation.generated_groq": { label: "Rekomendasi tindakan dibuat", description: "Rekomendasi analitis dihasilkan AI" },
  "auth.registered_pending": { label: "Pendaftaran akun baru", description: "Registrasi pengguna menunggu verifikasi" },
  "account.verified": { label: "Akun petugas disetujui", description: "Aktivasi akses akun operasional" },
  "account.rejected": { label: "Akun pengguna ditolak", description: "Penolakan akses akun pengguna" },
  "account.batch_verified": { label: "Verifikasi massal akun", description: "Persetujuan serentak beberapa akun" },
  "account.batch_rejected": { label: "Penolakan massal akun", description: "Penolakan serentak beberapa akun" },
};

function getActionMeta(action: string) {
  if (actionDictionary[action]) return actionDictionary[action];
  const parts = action.split(".");
  const suffix = parts.length > 1 ? parts.slice(1).join(" ") : action;
  const readable = suffix
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  return { label: readable, description: action };
}

// ── Categories & Badges ──────────────────────────────────────────────
const auditFilters = ["semua", "verifikasi", "alokasi", "status", "entri"] as const;
type AuditFilter = (typeof auditFilters)[number];
type AuditCategory = Exclude<AuditFilter, "semua">;

const filterMeta: Record<AuditFilter, { label: string; icon: LucideIcon }> = {
  semua: { label: "Semua", icon: FileClock },
  verifikasi: { label: "Verifikasi", icon: ShieldCheck },
  alokasi: { label: "Alokasi", icon: PackageCheck },
  status: { label: "Status", icon: Route },
  entri: { label: "Entri Data", icon: FilePlus2 },
};

const categoryByAction: Record<string, AuditCategory> = {
  "aid_request.submitted": "entri",
  "aid_request.reviewed": "verifikasi",
  "aid_request.rejected": "verifikasi",
  "aid_request.allocated": "alokasi",
  "aid_request.partially_fulfilled": "alokasi",
  "aid_request.fulfilled": "status",
  "aid_allocation.created": "alokasi",
  "aid_allocation.delivered": "status",
  "sms.accepted": "verifikasi",
  "sms.edited_and_accepted": "verifikasi",
  "sms.rejected": "verifikasi",
  "sms.marked_duplicate": "verifikasi",
  "report.verified": "verifikasi",
  "report.needs_verification": "verifikasi",
  "report.marked_duplicate": "verifikasi",
  "report.rejected": "verifikasi",
  "report.followed_up": "status",
  "report.converted_to_event": "status",
  "recommendation.reviewed": "verifikasi",
  "account.verified": "verifikasi",
  "account.rejected": "verifikasi",
  "account.batch_verified": "verifikasi",
  "account.batch_rejected": "verifikasi",
  "report.ai_triaged_groq": "verifikasi",
  "ai_recommendation.generated_groq": "verifikasi",
  "distribution.allocated": "alokasi",
  "third_party_aid.allocated": "alokasi",
  "third_party_aid.received_at_warehouse": "alokasi",
  "event.escalated": "status",
  "event.opened_from_report": "status",
  "distribution.status_updated": "status",
  "distribution.checkpoint_updated": "status",
  "distribution.received": "status",
  "shelter.population_updated": "status",
  "sms.received_and_parsed": "entri",
  "report.created": "entri",
  "shelter.created": "entri",
  "distribution.created": "entri",
  "third_party_aid.created": "entri",
  "need.requested": "entri",
  "auth.registered_pending": "entri",
};

function auditCategory(action: string): AuditCategory {
  const known = categoryByAction[action];
  if (known) return known;
  if (action.includes("verified") || action.includes("rejected") || action.includes("reviewed")) return "verifikasi";
  if (action.includes("allocated")) return "alokasi";
  if (action.includes("created") || action.includes("requested")) return "entri";
  return "status";
}

const categoryBadgeStyle: Record<AuditCategory, string> = {
  verifikasi:
    "border-emerald-300/80 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300",
  alokasi:
    "border-amber-300/80 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
  status:
    "border-blue-300/80 bg-blue-50 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300",
  entri:
    "border-slate-300/80 bg-slate-100 text-slate-800 dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-300",
};

const rejectionBadgeStyle =
  "border-rose-300/80 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300";

function actionBadgeStyle(action: string) {
  if (
    action === "report.rejected" ||
    action === "account.rejected" ||
    action === "account.batch_rejected" ||
    action === "sms.rejected" ||
    action === "aid_request.rejected"
  ) {
    return rejectionBadgeStyle;
  }
  return categoryBadgeStyle[auditCategory(action)];
}

function ActionIcon({ action }: { action: string }) {
  if (action === "report.rejected" || action === "account.rejected" || action === "account.batch_rejected") {
    return <Ban className="size-3.5 shrink-0" aria-hidden="true" />;
  }
  const Icon = filterMeta[auditCategory(action)].icon;
  return <Icon className="size-3.5 shrink-0" aria-hidden="true" />;
}

// ── Status Labels & Styles ──────────────────────────────────────────
const statusLabels: Record<string, string> = {
  baru: "Baru",
  diverifikasi: "Diverifikasi",
  ditindaklanjuti: "Ditindaklanjuti",
  ditolak: "Ditolak",
  disiapkan: "Disiapkan",
  "dalam-perjalanan": "Dalam perjalanan",
  diterima: "Diterima",
  "menunggu-pencocokan": "Menunggu pencocokan",
  "diterima-gudang": "Diterima gudang",
  dialokasikan: "Dialokasikan",
  critical: "Bahaya tinggi",
  major: "Terdampak berat",
  warning: "Perlu waspada",
  safe: "Relatif aman",
};

function statusLabel(status: string) {
  return statusLabels[status] ?? status;
}

// ── Severity & Role Dictionaries ────────────────────────────────────
const severityMeta: Record<string, { label: string; className: string }> = {
  critical: {
    label: "Kritis",
    className: "border-rose-400/50 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-300",
  },
  warning: {
    label: "Peringatan",
    className: "border-amber-400/50 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300",
  },
  important: {
    label: "Penting",
    className: "border-sky-400/50 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300",
  },
  notice: {
    label: "Penting",
    className: "border-sky-400/50 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300",
  },
  info: {
    label: "Info",
    className: "border-slate-300/60 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  bpbd_operator: "Operator BPBD",
  field_officer: "Petugas Lapangan",
  shelter_manager: "Pengelola Posko",
  warehouse_manager: "Pengelola Gudang",
  driver: "Pengemudi Armada",
  citizen: "Warga Pelapor",
  system: "Sistem Otomatis",
};

function humanRole(role: string): string {
  return roleLabels[role] ?? role;
}

// ── Human Target Resolver ────────────────────────────────────────────
function getTargetMeta(log: AuditLogItem) {
  const payload = log.afterData ?? log.beforeData ?? {};
  const code = (payload.code ?? payload.distribution_code ?? "") as string;
  const name = (payload.name ?? payload.source_name ?? "") as string;

  let title = "";
  switch (log.targetTable) {
    case "distributions":
      title = code ? `Distribusi ${code}` : "Distribusi Armada";
      break;
    case "shelters":
      title = name ? `Posko ${name}` : code ? `Posko ${code}` : "Posko Pengungsian";
      break;
    case "field_reports":
      title = code ? `Laporan ${code}` : name ? `Laporan ${name}` : "Laporan Lapangan";
      break;
    case "disaster_events":
      title = name ? `Bencana ${name}` : "Kejadian Bencana";
      break;
    case "third_party_aids":
      title = name ? `Bantuan ${name}` : "Bantuan Pihak Ketiga";
      break;
    case "needs":
      title = name ? `Kebutuhan ${name}` : "Kebutuhan Posko";
      break;
    case "ai_recommendations":
      title = "Rekomendasi AI";
      break;
    case "profiles":
    case "users":
      title = name ? `Akun ${name}` : "Akun Pengguna";
      break;
    default:
      title = `${log.targetTable} ${code || name}`.trim();
  }

  const idPart = log.targetId ? `#${log.targetId.slice(0, 8)}...` : null;
  const subtitle = idPart ? `${log.targetTable} · ${idPart}` : log.targetTable;

  return { title, subtitle };
}

// ── Intelligent Audit Diff Generator ─────────────────────────────────
function getDiffSummary(log: AuditLogItem): {
  primary: React.ReactNode;
  secondary?: string | null;
} {
  const before = log.beforeData;
  const after = log.afterData;

  // 1. Status Transition diff
  if (log.beforeStatus && log.afterStatus && log.beforeStatus !== log.afterStatus) {
    const fromLabel = statusLabel(log.beforeStatus);
    const toLabel = statusLabel(log.afterStatus);

    let extraNote: string | null = null;
    if (after?.driver_note && typeof after.driver_note === "string") {
      extraNote = `Catatan: "${after.driver_note}"`;
    } else if (after?.note && typeof after.note === "string") {
      extraNote = `Catatan: "${after.note}"`;
    }

    return {
      primary: (
        <span className="inline-flex flex-wrap items-center gap-1.5 font-sans">
          <span className="text-muted-foreground">Status:</span>
          <span className="font-medium text-foreground/80 line-through opacity-75">{fromLabel}</span>
          <span className="text-muted-foreground">&rarr;</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-300">{toLabel}</span>
        </span>
      ),
      secondary: extraNote,
    };
  }

  // 2. Action specific diffs
  if (log.action === "distribution.checkpoint_updated") {
    const loc = (after?.last_location_name ?? after?.location) as string | undefined;
    const note = after?.driver_note as string | undefined;
    return {
      primary: (
        <span className="font-sans">
          <span className="text-muted-foreground">Checkpoint:</span>{" "}
          <strong className="font-semibold text-foreground">{loc ?? "Lokasi armada diperbarui"}</strong>
        </span>
      ),
      secondary: note ? `Catatan armada: "${note}"` : null,
    };
  }

  if (log.action === "shelter.population_updated") {
    const beforePop = before?.current_population ?? before?.total_residents;
    const afterPop = after?.current_population ?? after?.total_residents;
    if (beforePop !== undefined && afterPop !== undefined && beforePop !== afterPop) {
      const diff = Number(afterPop) - Number(beforePop);
      const diffSign = diff > 0 ? `+${diff}` : `${diff}`;
      return {
        primary: (
          <span className="font-sans">
            <span className="text-muted-foreground">Populasi:</span>{" "}
            <span className="line-through opacity-75">{String(beforePop)}</span> &rarr;{" "}
            <strong className="font-semibold text-foreground">{String(afterPop)} jiwa</strong>{" "}
            <span className="text-xs text-muted-foreground">({diffSign})</span>
          </span>
        ),
      };
    }
    return {
      primary: "Populasi posko diperbarui",
    };
  }

  if (log.action === "report.rejected") {
    const reason = (after?.rejection_reason ?? after?.note) as string | undefined;
    return {
      primary: (
        <span className="font-sans text-rose-700 dark:text-rose-300 font-medium">
          Laporan ditolak / ditandai duplikat saat triase
        </span>
      ),
      secondary: reason ? `Alasan: ${reason}` : null,
    };
  }

  if (log.action === "report.verified") {
    return {
      primary: <span className="font-sans text-emerald-700 dark:text-emerald-300 font-medium">Laporan diverifikasi untuk eskalasi tanggap darurat</span>,
    };
  }

  if (log.action === "distribution.received") {
    return {
      primary: <span className="font-sans text-emerald-700 dark:text-emerald-300 font-medium">Bantuan logistik tiba dan diserahterimakan di posko</span>,
      secondary: after?.note ? `Catatan: ${after.note}` : null,
    };
  }

  if (log.action === "distribution.allocated") {
    const cargo = (after?.cargo ?? after?.cargo_summary) as string | undefined;
    return {
      primary: (
        <span className="font-sans">
          <span className="text-muted-foreground">Stok dialokasikan:</span>{" "}
          <strong className="font-semibold text-foreground">{cargo ?? "Alokasi logistik disetujui"}</strong>
        </span>
      ),
    };
  }

  if (log.action === "third_party_aid.created") {
    const source = after?.source_name as string | undefined;
    const cargo = after?.cargo as string | undefined;
    return {
      primary: (
        <span className="font-sans">
          Bantuan dicatat dari <strong className="font-semibold text-foreground">{source ?? "pihak ketiga"}</strong>
          {cargo ? ` (${cargo})` : ""}
        </span>
      ),
    };
  }

  if (log.action === "third_party_aid.received_at_warehouse") {
    return {
      primary: <span className="font-sans text-emerald-700 dark:text-emerald-300 font-medium">Bantuan diterima dan diverifikasi di gudang penyangga</span>,
    };
  }

  // Fallback: If status is present
  if (log.afterStatus) {
    return {
      primary: (
        <span className="font-sans">
          <span className="text-muted-foreground">Status:</span>{" "}
          <strong className="font-semibold text-foreground">{statusLabel(log.afterStatus)}</strong>
        </span>
      ),
      secondary: log.afterSummary && !log.afterSummary.includes("status:") ? log.afterSummary : null,
    };
  }

  // General fallback: clean after summary
  return {
    primary: <span className="font-sans text-foreground/90">{log.afterSummary}</span>,
  };
}

// ── Types for Sorting ────────────────────────────────────────────────
type SortColumn = "waktu" | "aksi" | "pelaku" | "target";
type SortDirection = "asc" | "desc";

export function AuditLogTable({
  initialLogs,
  uniqueTablesCount,
  thirdPartyAidCount,
  initialFilter = "semua",
}: {
  initialLogs: AuditLogItem[];
  uniqueTablesCount: number;
  thirdPartyAidCount: number;
  initialFilter?: AuditFilter;
}) {
  const [activeFilter, setActiveFilter] = React.useState<AuditFilter>(initialFilter);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortColumn, setSortColumn] = React.useState<SortColumn>("waktu");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  // Reset pagination on filter or search changes
  const handleFilterChange = (filter: AuditFilter) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      // Default newest first for time, A-Z for text
      setSortDirection(column === "waktu" ? "desc" : "asc");
    }
    setCurrentPage(1);
  };

  // Filter counts across initial dataset
  const filterCounts = React.useMemo(() => {
    return {
      semua: initialLogs.length,
      verifikasi: initialLogs.filter((log) => auditCategory(log.action) === "verifikasi").length,
      alokasi: initialLogs.filter((log) => auditCategory(log.action) === "alokasi").length,
      status: initialLogs.filter((log) => auditCategory(log.action) === "status").length,
      entri: initialLogs.filter((log) => auditCategory(log.action) === "entri").length,
    };
  }, [initialLogs]);

  // Filtered dataset by category & search query
  const filteredLogs = React.useMemo(() => {
    return initialLogs.filter((log) => {
      // 1. Category check
      if (activeFilter !== "semua" && auditCategory(log.action) !== activeFilter) {
        return false;
      }

      // 2. Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const actionInfo = getActionMeta(log.action);
        const targetInfo = getTargetMeta(log);

        const match =
          log.actorName.toLowerCase().includes(q) ||
          log.actorEmail.toLowerCase().includes(q) ||
          log.actorRole.toLowerCase().includes(q) ||
          humanRole(log.actorRole).toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          actionInfo.label.toLowerCase().includes(q) ||
          targetInfo.title.toLowerCase().includes(q) ||
          targetInfo.subtitle.toLowerCase().includes(q) ||
          (log.summary && log.summary.toLowerCase().includes(q)) ||
          (log.severity && log.severity.toLowerCase().includes(q)) ||
          log.afterSummary.toLowerCase().includes(q) ||
          (log.beforeSummary && log.beforeSummary.toLowerCase().includes(q)) ||
          (log.targetId && log.targetId.toLowerCase().includes(q));

        if (!match) return false;
      }

      return true;
    });
  }, [initialLogs, activeFilter, searchQuery]);

  // Sorted dataset
  const sortedLogs = React.useMemo(() => {
    const list = [...filteredLogs];

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "waktu":
          cmp = a.createdAtIso.localeCompare(b.createdAtIso);
          break;
        case "aksi": {
          const labelA = getActionMeta(a.action).label;
          const labelB = getActionMeta(b.action).label;
          cmp = labelA.localeCompare(labelB, "id");
          break;
        }
        case "pelaku":
          cmp = a.actorName.localeCompare(b.actorName, "id");
          break;
        case "target": {
          const targetA = getTargetMeta(a).title;
          const targetB = getTargetMeta(b).title;
          cmp = targetA.localeCompare(targetB, "id");
          break;
        }
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return list;
  }, [filteredLogs, sortColumn, sortDirection]);

  // Pagination calculation
  const totalRecords = sortedLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const paginatedLogs = sortedLogs.slice(startIndex, endIndex);

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
    <>
      {/* ── Table Header with Secondary Domain Metadata ── */}
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">
            Riwayat Perubahan
          </h2>
          <p className="font-sans text-xs text-muted-foreground">
            Audit log memantau siapa mengubah apa, kapan, target data, dan dampak perubahannya.
          </p>
        </div>

        {/* Secondary Domain Metadata (Demoted from top cards) */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-2 py-1 font-sans text-[11px] text-muted-foreground"
            title="Jumlah domain tabel database yang tercatat perubahannya"
          >
            <Database className="size-3 text-muted-foreground/80" />
            <span>
              <strong className="font-semibold text-foreground">{uniqueTablesCount}</strong> target tabel
            </span>
          </span>
          {thirdPartyAidCount > 0 && (
            <span
              className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-2 py-1 font-sans text-[11px] text-muted-foreground"
              title="Log mutasi bantuan pihak ketiga / lembaga eksternal"
            >
              <Boxes className="size-3 text-muted-foreground/80" />
              <span>
                <strong className="font-semibold text-foreground">{thirdPartyAidCount}</strong> bantuan eksternal
              </span>
            </span>
          )}
        </div>
      </div>

      {/* ── Integrated Filter & Search Toolbar ── */}
      <div className="flex flex-col gap-2.5 border-y border-border/60 bg-muted/20 px-4 py-2.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Category Pills */}
        <div
          role="group"
          aria-label="Filter kategori aksi audit"
          className="flex flex-wrap items-center gap-1"
        >
          {auditFilters.map((filter) => {
            const isActive = filter === activeFilter;
            const Icon = filterMeta[filter].icon;
            return (
              <Button
                key={filter}
                type="button"
                size="sm"
                variant={isActive ? "default" : "ghost"}
                onClick={() => handleFilterChange(filter)}
                className={cn(
                  "h-7 gap-1.5 rounded-md px-2.5 font-sans text-xs font-medium transition-colors duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-2xs hover:bg-primary/95"
                    : "text-muted-foreground hover:bg-background hover:text-foreground dark:hover:bg-input/30",
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                <span>{filterMeta[filter].label}</span>
                <span
                  className={cn(
                    "rounded px-1 text-[10.5px] tabular-nums font-mono",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {filterCounts[filter]}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Search Input Box */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari kode, aktor, aksi..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-7.5 pl-8 pr-7 text-xs font-sans placeholder:text-muted-foreground/70"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Hapus pencarian"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table Content ── */}
      <div className="p-0">
        {paginatedLogs.length > 0 ? (
          <>
            {/* Mobile View: High-Density Card List */}
            <div className="grid gap-2.5 p-3 sm:hidden">
              {paginatedLogs.map((log) => {
                const actionInfo = getActionMeta(log.action);
                const targetInfo = getTargetMeta(log);
                const diff = getDiffSummary(log);

                return (
                  <article
                    key={log.id}
                    className="rounded-xl border border-border/70 bg-background/80 p-3 shadow-2xs transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn("gap-1.5 text-xs py-0.5 px-2", actionBadgeStyle(log.action))}
                          >
                            <ActionIcon action={log.action} />
                            <span>{actionInfo.label}</span>
                          </Badge>
                          <span
                            className={cn(
                              "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                              severityMeta[log.severity]?.className || severityMeta.info.className
                            )}
                          >
                            {severityMeta[log.severity]?.label || "Info"}
                          </span>
                        </div>
                        <span
                          className="font-mono text-[10px] text-muted-foreground/75 tracking-tight pl-0.5"
                          title={log.action}
                        >
                          {log.action}
                        </span>
                      </div>
                      <span className="font-mono text-[10.5px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground border border-border/50 shrink-0">
                        {log.targetTable}
                      </span>
                    </div>

                    <div className="mt-2 text-xs font-sans">
                      <p className="font-semibold text-foreground">{targetInfo.title}</p>
                      <p className="font-mono text-[10.5px] text-muted-foreground">{targetInfo.subtitle}</p>
                    </div>

                    <div className="mt-2.5 rounded-lg bg-muted/30 p-2.5 text-xs font-sans space-y-1.5">
                      {log.summary && (
                        <p className="font-medium text-foreground text-xs leading-relaxed">
                          {log.summary}
                        </p>
                      )}
                      <div>{diff.primary}</div>
                      {diff.secondary && (
                        <p className="text-[11px] text-muted-foreground">{diff.secondary}</p>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-border/50 pt-2 text-xs font-sans">
                      <div>
                        <p className="font-semibold text-foreground text-xs">{log.actorName}</p>
                        <p className="text-[11px] text-muted-foreground">{humanRole(log.actorRole)}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground tabular-nums">{log.createdAt}</p>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Desktop View: Audit Table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/25">
                  <TableRow>
                    {/* Waktu (Sortable) */}
                    <TableHead className="w-36 font-sans text-xs font-semibold text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => handleSort("waktu")}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <span>Waktu</span>
                        {renderSortIndicator("waktu")}
                      </button>
                    </TableHead>

                    {/* Aksi (Sortable) */}
                    <TableHead className="min-w-48 font-sans text-xs font-semibold text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => handleSort("aksi")}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <span>Aksi</span>
                        {renderSortIndicator("aksi")}
                      </button>
                    </TableHead>

                    {/* Pelaku (Sortable) - Strictly "Pelaku" in Indonesian */}
                    <TableHead className="w-44 font-sans text-xs font-semibold text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => handleSort("pelaku")}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <span>Pelaku</span>
                        {renderSortIndicator("pelaku")}
                      </button>
                    </TableHead>

                    {/* Target Data (Sortable) */}
                    <TableHead className="w-44 font-sans text-xs font-semibold text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => handleSort("target")}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <span>Target Data</span>
                        {renderSortIndicator("target")}
                      </button>
                    </TableHead>

                    {/* Ringkasan Perubahan */}
                    <TableHead className="font-sans text-xs font-semibold text-muted-foreground">
                      Ringkasan Perubahan
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => {
                    const actionInfo = getActionMeta(log.action);
                    const targetInfo = getTargetMeta(log);
                    const diff = getDiffSummary(log);

                    return (
                      <TableRow
                        key={log.id}
                        className="transition-colors duration-150 hover:bg-muted/50"
                      >
                        {/* Waktu */}
                        <TableCell className="align-top font-sans text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {log.createdAt}
                        </TableCell>

                        {/* Aksi (Human label prominent, technical slug secondary) */}
                        <TableCell className="min-w-48 align-top">
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "gap-1.5 font-sans font-medium text-xs py-0.5 px-2",
                                  actionBadgeStyle(log.action),
                                )}
                                title={actionInfo.description ?? log.action}
                              >
                                <ActionIcon action={log.action} />
                                <span>{actionInfo.label}</span>
                              </Badge>
                              <span
                                className={cn(
                                  "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                  severityMeta[log.severity]?.className || severityMeta.info.className
                                )}
                              >
                                {severityMeta[log.severity]?.label || "Info"}
                              </span>
                            </div>
                            <span
                              className="font-mono text-[10.5px] text-muted-foreground/70 tracking-tight pl-0.5"
                              title={log.action}
                            >
                              {log.action}
                            </span>
                          </div>
                        </TableCell>

                        {/* Pelaku */}
                        <TableCell className="align-top">
                          <p className="font-sans font-semibold text-xs text-foreground">
                            {log.actorName}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1 font-sans text-[11px] text-muted-foreground">
                            <span>{humanRole(log.actorRole)}</span>
                            {log.actorEmail && log.actorEmail !== "-" && (
                              <>
                                <span>·</span>
                                <span className="truncate max-w-[130px]" title={log.actorEmail}>
                                  {log.actorEmail}
                                </span>
                              </>
                            )}
                          </div>
                        </TableCell>

                        {/* Target Data (Human Title + Table & ID secondary) */}
                        <TableCell className="align-top">
                          <p className="font-sans font-semibold text-xs text-foreground">
                            {targetInfo.title}
                          </p>
                          <p
                            className="mt-0.5 max-w-40 truncate font-mono text-[10.5px] text-muted-foreground"
                            title={targetInfo.subtitle}
                          >
                            {targetInfo.subtitle}
                          </p>
                        </TableCell>

                        {/* Ringkasan Perubahan (Audit diff pattern) */}
                        <TableCell className="max-w-lg align-top whitespace-normal">
                          {log.summary && (
                            <p className="font-sans font-medium text-xs text-foreground mb-1 leading-relaxed">
                              {log.summary}
                            </p>
                          )}
                          <div className="text-xs leading-relaxed text-foreground/80">
                            {diff.primary}
                          </div>
                          {diff.secondary && (
                            <p className="mt-0.5 font-sans text-[11px] text-muted-foreground line-clamp-2">
                              {diff.secondary}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="py-12 text-center font-sans text-xs text-muted-foreground">
            {searchQuery
              ? `Tidak ditemukan riwayat audit log untuk pencarian "${searchQuery}".`
              : `Tidak ada riwayat audit log untuk filter “${filterMeta[activeFilter].label}”.`}
          </div>
        )}
      </div>

      {/* ── Built-in Pagination Controls ── */}
      {totalRecords > 0 && (
        <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/15 px-4 py-3 font-sans sm:flex-row sm:items-center sm:justify-between sm:px-5">
          {/* Rows per page & Range text */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Baris per halaman:</span>
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

            <span className="tabular-nums">
              Menampilkan <strong className="font-semibold text-foreground">{startIndex + 1}</strong>–
              <strong className="font-semibold text-foreground">{endIndex}</strong> dari{" "}
              <strong className="font-semibold text-foreground">{totalRecords}</strong> riwayat
            </span>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
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

            {/* Page indicator pills */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  // Show current, edges, and neighbors
                  return (
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - validPage) <= 1
                  );
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
    </>
  );
}
