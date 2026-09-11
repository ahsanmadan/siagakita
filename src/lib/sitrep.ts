import type {
  AIRecommendation,
  CrisisStatus,
  DisasterEvent,
  Distribution,
  Institution,
  Shelter,
} from "@/lib/types";

const statusLabels: Record<CrisisStatus, string> = {
  critical: "Bahaya Tinggi",
  major: "Terdampak Berat",
  warning: "Perlu Waspada",
  safe: "Relatif Aman",
};

const distributionLabels: Record<Distribution["status"], string> = {
  menunggu_alokasi: "Menunggu alokasi armada",
  dialokasikan: "Armada dialokasikan",
  disiapkan: "Disiapkan di gudang",
  berangkat: "Armada berangkat",
  dalam_perjalanan: "Dalam perjalanan",
  "dalam-perjalanan": "Dalam perjalanan",
  tertunda: "Pengiriman tertunda",
  tiba_di_posko: "Tiba di posko",
  diterima_posko: "Diterima posko",
  diterima: "Diterima",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });
const timeFormatter = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const stampFormatter = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Jakarta" });

function formatNumber(value: number) {
  return value.toLocaleString("id-ID");
}

function coordinateLabel(latitude: number, longitude: number) {
  const lat = `${Math.abs(latitude).toFixed(4)}° ${latitude < 0 ? "LS" : "LU"}`;
  const lon = `${Math.abs(longitude).toFixed(4)}° ${longitude < 0 ? "BB" : "BT"}`;
  return `${lat}, ${lon}`;
}

export type SitrepImpactItem = {
  label: string;
  value: string;
  note?: string;
};

export type SitrepShelterRow = {
  code: string;
  name: string;
  location: string;
  statusLabel: string;
  population: string;
  vulnerable: string;
  capacity: string;
  coordinates: string;
  lastUpdate: string;
};

export type SitrepNeedRow = {
  item: string;
  category: string;
  shelterName: string;
  requested: string;
  available: string;
  gap: string;
  unit: string;
  urgencyLabel: string;
};

export type SitrepAllocationRow = {
  code: string;
  cargo: string;
  origin: string;
  destination: string;
  institution: string;
  eta: string;
  statusLabel: string;
  progress: string;
};

export type SitrepData = {
  documentNumber: string;
  issuedDateLabel: string;
  issuedTimeLabel: string;
  event: {
    code: string;
    name: string;
    type: string;
    location: string;
    province: string;
    statusLabel: string;
    escalationLevel: string;
    summary: string;
    coordinates: string;
    affectedPeople: string;
    updatedAt: string;
  };
  impact: SitrepImpactItem[];
  shelters: SitrepShelterRow[];
  needs: SitrepNeedRow[];
  allocations: SitrepAllocationRow[];
  institutions: Array<{ name: string; role: string; statusLabel: string }>;
  decisionSupport: { title: string; action: string; rationale: string; confidence: string } | null;
  publicLink: string;
  signature: {
    place: string;
    dateLabel: string;
    roleTitle: string;
    unit: string;
  };
};

export function buildSitrep({
  event,
  shelters,
  institutions,
  distributions,
  recommendation,
  publicLink,
  issuedAt = new Date(),
}: {
  event: DisasterEvent;
  shelters: Shelter[];
  institutions: Institution[];
  distributions: Distribution[];
  recommendation?: AIRecommendation | null;
  publicLink: string;
  issuedAt?: Date;
}): SitrepData {
  const shelteredPeople = shelters.reduce((total, shelter) => total + shelter.population.total, 0);
  const vulnerablePeople = shelters.reduce(
    (total, shelter) =>
      total + shelter.population.children + shelter.population.elderly + shelter.population.pregnant + shelter.population.disability,
    0,
  );
  const criticalShelters = shelters.filter((shelter) => shelter.status === "critical").length;
  const activeInstitutions = institutions.filter((institution) => institution.contactStatus === "aktif");

  const needs = shelters
    .flatMap((shelter) =>
      shelter.needs
        .filter((need) => need.urgency === "critical" || need.requested > need.available)
        .map((need) => ({ need, shelter })),
    )
    .sort((a, b) => b.need.requested - b.need.available - (a.need.requested - a.need.available))
    .slice(0, 12)
    .map(({ need, shelter }) => ({
      item: need.item,
      category: need.category,
      shelterName: shelter.name,
      requested: formatNumber(need.requested),
      available: formatNumber(need.available),
      gap: formatNumber(Math.max(0, need.requested - need.available)),
      unit: need.unit,
      urgencyLabel: statusLabels[need.urgency],
    }));

  return {
    documentNumber: `SITREP/${event.id}/${stampFormatter.format(issuedAt).replace(/-/g, "")}`,
    issuedDateLabel: dateFormatter.format(issuedAt),
    issuedTimeLabel: `${timeFormatter.format(issuedAt)} WIB`,
    event: {
      code: event.id,
      name: event.name,
      type: event.type,
      location: event.location,
      province: event.province,
      statusLabel: statusLabels[event.status],
      escalationLevel: event.escalationLevel,
      summary: event.summary,
      coordinates: coordinateLabel(event.coordinates.latitude, event.coordinates.longitude),
      affectedPeople: formatNumber(event.affectedPeople),
      updatedAt: event.updatedAt,
    },
    impact: [
      { label: "Warga terdampak", value: `${formatNumber(event.affectedPeople)} jiwa` },
      { label: "Pengungsi di posko", value: `${formatNumber(shelteredPeople)} jiwa`, note: `Tersebar di ${shelters.length} posko` },
      {
        label: "Kelompok rentan",
        value: `${formatNumber(vulnerablePeople)} jiwa`,
        note: "Anak, lansia, ibu hamil, dan penyandang disabilitas",
      },
      {
        label: "Korban jiwa",
        value: "Belum ada data terverifikasi",
        note: "Basis data kejadian belum mencatat angka korban jiwa untuk periode ini.",
      },
      { label: "Posko aktif", value: `${formatNumber(shelters.length)} posko`, note: `${formatNumber(criticalShelters)} posko berstatus bahaya tinggi` },
      {
        label: "Status tanggap darurat",
        value: `${event.escalationLevel} · ${statusLabels[event.status]}`,
        note: `Pembaruan lapangan terakhir ${event.updatedAt}`,
      },
    ],
    shelters: shelters.map((shelter) => ({
      code: shelter.id,
      name: shelter.name,
      location: shelter.location,
      statusLabel: statusLabels[shelter.status],
      population: formatNumber(shelter.population.total),
      vulnerable: formatNumber(
        shelter.population.children + shelter.population.elderly + shelter.population.pregnant + shelter.population.disability,
      ),
      capacity: formatNumber(shelter.capacity),
      coordinates: coordinateLabel(shelter.coordinates.latitude, shelter.coordinates.longitude),
      lastUpdate: shelter.lastUpdate,
    })),
    needs,
    allocations: distributions.map((distribution) => ({
      code: distribution.id,
      cargo: distribution.cargo,
      origin: distribution.origin,
      destination: distribution.destination,
      institution: distribution.institution,
      eta: distribution.eta,
      statusLabel: distributionLabels[distribution.status],
      progress: `${distribution.progress}%`,
    })),
    institutions: activeInstitutions.map((institution) => ({
      name: institution.name,
      role: institution.role,
      statusLabel: institution.contactStatus === "aktif" ? "Kontak aktif" : "Menunggu konfirmasi",
    })),
    decisionSupport: recommendation
      ? {
          title: recommendation.title,
          action: recommendation.action,
          rationale: recommendation.rationale,
          confidence: `${recommendation.confidence}%`,
        }
      : null,
    publicLink,
    signature: {
      place: `${event.location}, ${event.province}`,
      dateLabel: dateFormatter.format(issuedAt),
      roleTitle: "Penanggung Jawab Komando Operasi",
      unit: "Pos Komando Tanggap Darurat · BPBD",
    },
  };
}
