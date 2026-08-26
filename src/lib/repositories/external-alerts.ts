import type { CrisisStatus } from "@/lib/types";

export type PublicExternalAlert = {
  id: string;
  source: "BMKG";
  sourceUrl: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status: CrisisStatus;
  kind: "Gempa";
  detail: string;
  updatedAt: string;
};

type BmkgAutoGempaResponse = {
  Infogempa?: {
    gempa?: {
      Tanggal?: string;
      Jam?: string;
      DateTime?: string;
      Coordinates?: string;
      Lintang?: string;
      Bujur?: string;
      Magnitude?: string;
      Kedalaman?: string;
      Wilayah?: string;
      Potensi?: string;
      Dirasakan?: string;
    };
  };
};

function parseBmkgCoordinate(value: string | undefined) {
  if (!value) return null;
  const [latitudeRaw, longitudeRaw] = value.split(",").map((part) => Number(part.trim()));

  if (!Number.isFinite(latitudeRaw) || !Number.isFinite(longitudeRaw)) return null;

  return { latitude: latitudeRaw, longitude: longitudeRaw };
}

function statusFromMagnitude(value: string | undefined): CrisisStatus {
  const magnitude = Number(value);
  if (!Number.isFinite(magnitude)) return "warning";
  if (magnitude >= 6) return "critical";
  if (magnitude >= 5) return "major";
  return "warning";
}

function formatExternalTime(value: string | undefined) {
  if (!value) return "baru diperbarui";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "baru diperbarui";

  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.round(hours / 24)} hari lalu`;
}

export async function getBmkgEarthquakeAlert(): Promise<PublicExternalAlert | null> {
  try {
    const response = await fetch("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json", {
      headers: { accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as BmkgAutoGempaResponse;
    const gempa = payload.Infogempa?.gempa;
    const coordinates = parseBmkgCoordinate(gempa?.Coordinates);
    if (!gempa || !coordinates) return null;

    const magnitude = gempa.Magnitude ?? "-";
    const depth = gempa.Kedalaman ?? "kedalaman belum tersedia";
    const felt = gempa.Dirasakan ? ` Dirasakan: ${gempa.Dirasakan}.` : "";
    const potential = gempa.Potensi ? ` ${gempa.Potensi}.` : "";

    return {
      id: `bmkg-earthquake-${gempa.DateTime ?? `${coordinates.latitude}-${coordinates.longitude}`}`,
      source: "BMKG",
      sourceUrl: "https://data.bmkg.go.id/gempabumi/",
      name: `Gempa M ${magnitude}`,
      location: gempa.Wilayah ?? "Wilayah Indonesia",
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      status: statusFromMagnitude(magnitude),
      kind: "Gempa",
      detail: `Gempa terbaru BMKG, magnitudo ${magnitude}, ${depth}.${potential}${felt}`.trim(),
      updatedAt: formatExternalTime(gempa.DateTime),
    };
  } catch {
    return null;
  }
}
