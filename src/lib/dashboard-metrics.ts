import {
  Boxes,
  ClipboardList,
  Database,
  FileClock,
  MapPinned,
  RadioTower,
  ShieldCheck,
  TentTree,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import type { MapPoint } from "@/components/crisis-map";
import type { AppRole, CurrentProfile } from "@/lib/auth";
import type { CrisisStatus, DisasterEvent, Distribution, FieldReport, Inventory, Need, Shelter, AIRecommendation } from "@/lib/types";

export type DashboardMetrics = {
  activeEvents: number;
  affectedPeople: number;
  activeShelters: number;
  criticalNeeds: number;
};

export type UserSummary = {
  total: number;
  roles: { role: AppRole; count: number }[];
};

export type RoleDashboardData = {
  disasterEvents: DisasterEvent[];
  shelters: Shelter[];
  inventory: Inventory[];
  distributions: Distribution[];
  fieldReports: FieldReport[];
  recommendations: AIRecommendation[];
  metrics: DashboardMetrics;
};

export type ShelterNeed = Need & { shelterId: string; shelterName: string };

export type SectionCardTone = "brand" | "critical" | "teal" | "warning" | "neutral";

export type SectionCardDelta = {
  direction: "up" | "down" | "flat";
  label: string;
  caption: string;
};

export type SectionCardItem = {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
  tone: SectionCardTone;
  footerTitle: string;
  footerNote: string;
  delta?: SectionCardDelta;
};

export type ReportTrendPoint = {
  date: string;
  kritis: number;
  waspada: number;
};

export const TREND_WINDOW_DAYS = 90;

function distributionTone(status: Distribution["status"]): CrisisStatus {
  if (status === "diterima") return "safe";
  if (status === "dalam-perjalanan") return "warning";
  return "major";
}

function destinationShelter(distribution: Distribution, shelters: Shelter[]) {
  const destination = distribution.destination.toLowerCase();
  return shelters.find((shelter) =>
    destination.includes(shelter.name.toLowerCase()) ||
    destination.includes(shelter.location.toLowerCase()) ||
    shelter.name.toLowerCase().includes(destination),
  );
}

export function mapPointsFor(events: DisasterEvent[], shelters: Shelter[], distributions: Distribution[]): MapPoint[] {
  const needPoints: MapPoint[] = shelters.flatMap((shelter) =>
    shelter.needs
      .filter((need) => need.urgency === "critical" || need.requested > need.available)
      .slice(0, 2)
      .map((need) => ({
        id: `${shelter.id}-${need.id}-need`,
        name: need.item,
        location: shelter.name,
        latitude: shelter.coordinates.latitude,
        longitude: shelter.coordinates.longitude,
        status: need.urgency,
        kind: "Critical Need" as const,
        detail: `Kekurangan ${(need.requested - need.available).toLocaleString("id-ID")} ${need.unit} untuk posko.`,
      })),
  );

  const distributionPoints: MapPoint[] = distributions
    .filter((distribution) => distribution.status !== "diterima")
    .flatMap((distribution, index) => {
      const shelter = destinationShelter(distribution, shelters) ?? shelters[index % Math.max(shelters.length, 1)];
      if (!shelter) return [];
      return [{
        id: `${distribution.id}-distribution`,
        name: distribution.cargo,
        location: distribution.destination,
        latitude: shelter.coordinates.latitude,
        longitude: shelter.coordinates.longitude,
        status: distributionTone(distribution.status),
        kind: "Distribution" as const,
        detail: `${distribution.origin} ke ${distribution.destination} · ETA ${distribution.eta}`,
      }];
    });

  return [
    ...events.map((event) => ({
      id: event.id,
      name: event.name,
      location: `${event.location}, ${event.province}`,
      latitude: event.coordinates.latitude,
      longitude: event.coordinates.longitude,
      status: event.status,
      kind: "Kejadian" as const,
      detail: event.summary,
    })),
    ...shelters.map((shelter) => ({
      id: shelter.id,
      name: shelter.name,
      location: shelter.location,
      latitude: shelter.coordinates.latitude,
      longitude: shelter.coordinates.longitude,
      status: shelter.status,
      kind: "Posko" as const,
      detail: `${shelter.population.total} pengungsi · pembaruan ${shelter.lastUpdate}`,
    })),
    ...needPoints,
    ...distributionPoints,
  ];
}

export function activeDistributions(distributions: Distribution[]) {
  return distributions.filter((distribution) => distribution.status !== "diterima");
}

export function criticalNeeds(shelters: Shelter[]): ShelterNeed[] {
  return shelters
    .flatMap((shelter) => shelter.needs.map((need) => ({ ...need, shelterId: shelter.id, shelterName: shelter.name })))
    .filter((need) => need.urgency === "critical" || need.requested > need.available);
}

export function latestReportsFor(profile: CurrentProfile, fieldReports: FieldReport[]) {
  if (profile.role === "field_officer") {
    const ownLabel = profile.fullName.toLowerCase();
    const owned = fieldReports.filter((report) => report.reporter.toLowerCase().includes(ownLabel) || report.channel === "Petugas");
    return owned.length ? owned : fieldReports;
  }
  return fieldReports;
}

function dayKey(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function reportTrendSeries(fieldReports: FieldReport[], days = TREND_WINDOW_DAYS, now = new Date()): ReportTrendPoint[] {
  const buckets = new Map<string, ReportTrendPoint>();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    const key = dayKey(date);
    buckets.set(key, { date: key, kritis: 0, waspada: 0 });
  }

  for (const report of fieldReports) {
    const received = new Date(report.receivedAtIso);
    if (Number.isNaN(received.getTime())) continue;
    const bucket = buckets.get(dayKey(received));
    if (!bucket) continue;
    if (report.severity === "critical" || report.severity === "major") {
      bucket.kritis += 1;
    } else {
      bucket.waspada += 1;
    }
  }

  return [...buckets.values()];
}

function reportIntakeDelta(fieldReports: FieldReport[], now = new Date()): SectionCardDelta | undefined {
  const dayMs = 86_400_000;
  const currentStart = now.getTime() - 7 * dayMs;
  const previousStart = now.getTime() - 14 * dayMs;

  let current = 0;
  let previous = 0;

  for (const report of fieldReports) {
    const received = new Date(report.receivedAtIso).getTime();
    if (Number.isNaN(received)) continue;
    if (received >= currentStart) current += 1;
    else if (received >= previousStart) previous += 1;
  }

  if (current === 0 && previous === 0) return undefined;

  const difference = current - previous;
  return {
    direction: difference > 0 ? "up" : difference < 0 ? "down" : "flat",
    label: `${difference > 0 ? "+" : ""}${difference}`,
    caption: `Laporan masuk 7 hari terakhir (${current}) dibanding 7 hari sebelumnya (${previous}).`,
  };
}

export function roleSectionCards(
  profile: CurrentProfile,
  data: RoleDashboardData,
  userSummary?: UserSummary | null,
  now = new Date(),
): SectionCardItem[] {
  const needs = criticalNeeds(data.shelters);
  const distributions = activeDistributions(data.distributions);
  const pendingReports = data.fieldReports.filter(
    (report) => report.status === "baru" || report.status === "perlu_verifikasi",
  );
  const lowStock = data.inventory.filter((item) => item.status === "critical" || item.status === "warning");
  const intakeDelta = reportIntakeDelta(data.fieldReports, now);
  const vulnerablePeople = data.shelters.reduce(
    (total, shelter) => total + shelter.population.children + shelter.population.elderly + shelter.population.pregnant + shelter.population.disability,
    0,
  );

  if (profile.role === "field_officer") {
    const reports = latestReportsFor(profile, data.fieldReports);
    const verified = reports.filter(
      (report) =>
        report.status === "diverifikasi" ||
        report.status === "ditindaklanjuti" ||
        report.status === "dibuka_jadi_kejadian",
    ).length;

    return [
      {
        id: "reports",
        label: "Laporan saya",
        value: String(reports.length),
        icon: ClipboardList,
        tone: "brand",
        footerTitle: "Laporan lapangan tercatat",
        footerNote: "Dihitung dari laporan yang tersimpan di database.",
        delta: intakeDelta,
      },
      {
        id: "new",
        label: "Baru",
        value: String(
          reports.filter(
            (report) => report.status === "baru" || report.status === "perlu_verifikasi",
          ).length,
        ),
        icon: RadioTower,
        tone: "warning",
        footerTitle: "Menunggu petugas BPBD",
        footerNote: "Verifikasi tetap wewenang operator BPBD.",
      },
      {
        id: "verified",
        label: "Diverifikasi",
        value: String(verified),
        icon: ShieldCheck,
        tone: "teal",
        footerTitle: "Sudah masuk alur operasi",
        footerNote: "Termasuk laporan yang sudah ditindaklanjuti.",
      },
      {
        id: "events",
        label: "Kejadian aktif",
        value: String(data.metrics.activeEvents),
        icon: MapPinned,
        tone: "critical",
        footerTitle: "Konteks area operasi",
        footerNote: "Gunakan tab peta untuk orientasi lokasi.",
      },
    ];
  }

  if (profile.role === "shelter_manager") {
    return [
      {
        id: "population",
        label: "Pengungsi",
        value: data.shelters.reduce((total, shelter) => total + shelter.population.total, 0).toLocaleString("id-ID"),
        icon: Users,
        tone: "brand",
        footerTitle: "Total pada posko tercatat",
        footerNote: "Angka mengikuti pembaruan terakhir tiap posko.",
      },
      {
        id: "vulnerable",
        label: "Kelompok rentan",
        value: vulnerablePeople.toLocaleString("id-ID"),
        icon: ShieldCheck,
        tone: "warning",
        footerTitle: "Anak, lansia, ibu hamil, disabilitas",
        footerNote: "Dasar prioritas distribusi bantuan.",
      },
      {
        id: "needs",
        label: "Kebutuhan aktif",
        value: String(needs.length),
        icon: Boxes,
        tone: "critical",
        footerTitle: "Belum terpenuhi penuh",
        footerNote: "Kebutuhan kritis atau permintaan di atas ketersediaan.",
      },
      {
        id: "shelters",
        label: "Posko aktif",
        value: String(data.shelters.length),
        icon: TentTree,
        tone: "teal",
        footerTitle: "Perlu update berkala",
        footerNote: "Perbarui kondisi agar gudang memakai data terbaru.",
      },
    ];
  }

  if (profile.role === "warehouse_manager") {
    return [
      {
        id: "stock",
        label: "Jenis stok",
        value: `${data.inventory.filter((item) => item.stock - item.reserved > 0).length}/${data.inventory.length}`,
        icon: Warehouse,
        tone: "brand",
        footerTitle: "Saldo siap alokasi",
        footerNote: "Stok dikurangi jumlah yang sudah direservasi.",
      },
      {
        id: "low",
        label: "Stok perhatian",
        value: String(lowStock.length),
        icon: Boxes,
        tone: "warning",
        footerTitle: "Status warning atau kritis",
        footerNote: "Periksa sebelum distribusi berikutnya.",
      },
      {
        id: "requests",
        label: "Permintaan bantuan",
        value: String(needs.length),
        icon: ClipboardList,
        tone: "critical",
        footerTitle: "Dari kebutuhan posko",
        footerNote: "Alokasi dilakukan lewat modul logistik.",
      },
      {
        id: "delivery",
        label: "Distribusi aktif",
        value: String(distributions.length),
        icon: Truck,
        tone: "teal",
        footerTitle: "Perlu update perjalanan",
        footerNote: "Belum berstatus diterima posko.",
      },
    ];
  }

  if (profile.role === "admin") {
    return [
      {
        id: "events",
        label: "Kejadian aktif",
        value: String(data.metrics.activeEvents),
        icon: RadioTower,
        tone: "critical",
        footerTitle: "Status sistem operasional",
        footerNote: "Kejadian dengan state aktif di database.",
      },
      {
        id: "users",
        label: "Akun terdata",
        value: userSummary ? String(userSummary.total) : "-",
        icon: Users,
        tone: "brand",
        footerTitle: "Ringkasan profil bila tersedia",
        footerNote: userSummary ? `${userSummary.roles.length} peran memiliki akun aktif.` : "Ringkasan profil tidak dapat dibaca.",
      },
      {
        id: "audit",
        label: "Audit terbaru",
        value: "80",
        icon: FileClock,
        tone: "warning",
        footerTitle: "Maksimum riwayat yang ditampilkan",
        footerNote: "Audit log dibatasi 80 perubahan terakhir.",
      },
      {
        id: "data",
        label: "Domain aktif",
        value: "7",
        icon: Database,
        tone: "teal",
        footerTitle: "Domain data yang diawasi",
        footerNote: "Laporan, kejadian, posko, stok, distribusi, bantuan, audit.",
      },
    ];
  }

  return [
    {
      id: "events",
      label: "Kejadian aktif",
      value: String(data.metrics.activeEvents),
      icon: RadioTower,
      tone: "critical",
      footerTitle: `${data.disasterEvents.filter((event) => event.status === "critical").length} berstatus kritis`,
      footerNote: "Kejadian aktif yang sedang dikoordinasikan.",
    },
    {
      id: "reports",
      label: "Perlu verifikasi",
      value: String(pendingReports.length),
      icon: ClipboardList,
      tone: "warning",
      footerTitle: "Laporan menunggu keputusan BPBD",
      footerNote: "Belum boleh dibuka menjadi kejadian.",
      delta: intakeDelta,
    },
    {
      id: "needs",
      label: "Kebutuhan kritis",
      value: String(data.metrics.criticalNeeds || needs.length),
      icon: Boxes,
      tone: "critical",
      footerTitle: "Memerlukan alokasi segera",
      footerNote: "Dihitung dari kebutuhan posko yang tersimpan.",
    },
    {
      id: "delivery",
      label: "Distribusi aktif",
      value: String(distributions.length),
      icon: Truck,
      tone: "teal",
      footerTitle: "Pantau ETA dan penerimaan posko",
      footerNote: "Belum berstatus diterima posko.",
    },
  ];
}
