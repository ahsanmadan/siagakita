import type { Coordinates, CrisisStatus, SmsParseResult } from "@/lib/types";

interface KnownLocationMeta {
  name: string;
  coordinates: Coordinates;
}

const KNOWN_LOCATIONS: Record<string, KnownLocationMeta> = {
  AGM: {
    name: "Kab. Agam, Sumatera Barat",
    coordinates: { latitude: -0.2787, longitude: 100.1669 },
  },
  CJR: {
    name: "Kec. Cugenang, Kab. Cianjur",
    coordinates: { latitude: -6.8227, longitude: 107.1394 },
  },
  DMK: {
    name: "Kab. Demak, Jawa Tengah",
    coordinates: { latitude: -6.8944, longitude: 110.6386 },
  },
  SLM: {
    name: "Kab. Sleman, D.I. Yogyakarta",
    coordinates: { latitude: -7.6883, longitude: 110.3398 },
  },
  LUM: {
    name: "Kab. Lumajang, Jawa Timur",
    coordinates: { latitude: -8.1331, longitude: 113.2246 },
  },
};

const NEED_TRANSLATIONS: Record<string, { label: string; defaultUnit: string }> = {
  AIR_BERSIH: { label: "Air Bersih", defaultUnit: "liter" },
  BERAS: { label: "Beras & Sembako", defaultUnit: "kg" },
  TENDA_DARURAT: { label: "Tenda Darurat", defaultUnit: "unit" },
  TENDA: { label: "Tenda Pengungsi", defaultUnit: "unit" },
  OBAT: { label: "Obat-obatan & Medis", defaultUnit: "paket" },
  SELIMUT: { label: "Selimut & Sandang", defaultUnit: "lembar" },
  PERAHU_KARET: { label: "Perahu Karet Evakuasi", defaultUnit: "unit" },
  PERAHU: { label: "Perahu Karet", defaultUnit: "unit" },
  MAKANAN_BAYI: { label: "Makanan Bayi & Balita", defaultUnit: "paket" },
  GENSET: { label: "Genset Darurat", defaultUnit: "unit" },
};

const DISASTER_KEYWORDS: Record<string, string> = {
  BANJIR: "Banjir Bandang",
  GENANGAN: "Banjir",
  GEMPA: "Gempa Bumi",
  LONGSOR: "Tanah Longsor",
  ERUPSI: "Erupsi Gunung Api",
  ANGIN: "Angin Puting Beliung",
  KEBAKARAN: "Kebakaran",
};

export function parseZeroGridSms(raw: string, senderPhone?: string): SmsParseResult {
  const clean = (raw || "").trim();
  const parts = clean.split("#").map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 4 && parts[0].toUpperCase() === "LAPOR") {
    const code = parts[1] || "-";
    const needRaw = (parts[2] || "-").toUpperCase();
    const qtyRaw = parts[3] || "0";
    const notesRaw = parts.slice(4).join(" - ") || "Laporan darurat via SMS Zero-Grid";

    const prefix = code.replace(/[0-9]/g, "").toUpperCase();
    const knownLoc = KNOWN_LOCATIONS[prefix];
    const location = knownLoc ? knownLoc.name : `Sektor Lapangan ${code}`;
    const coordinates: Coordinates | null = knownLoc ? knownLoc.coordinates : null;

    const needConfig = NEED_TRANSLATIONS[needRaw];
    const needType = needConfig ? needConfig.label : needRaw.replace(/_/g, " ");
    const defaultUnit = needConfig ? needConfig.defaultUnit : "unit";

    const upperNotes = notesRaw.toUpperCase();
    const isCritical =
      upperNotes.includes("PUTUS") ||
      upperNotes.includes("JIWA") ||
      upperNotes.includes("DARURAT") ||
      needRaw.includes("PERAHU") ||
      needRaw.includes("OBAT");
    const severity: CrisisStatus = isCritical ? "critical" : "major";

    // Detect disaster type from notes or prefix
    let disasterType = "Bencana Alam";
    for (const [kw, name] of Object.entries(DISASTER_KEYWORDS)) {
      if (upperNotes.includes(kw) || clean.toUpperCase().includes(kw)) {
        disasterType = name;
        break;
      }
    }
    if (disasterType === "Bencana Alam") {
      if (prefix === "DMK") disasterType = "Banjir";
      else if (prefix === "CJR") disasterType = "Gempa Bumi";
      else if (prefix === "AGM") disasterType = "Banjir Lahar / Longsor";
      else if (prefix === "LUM") disasterType = "Erupsi Semeru";
      else if (prefix === "SLM") disasterType = "Aktivitas Merapi";
    }

    const numQty = Number(qtyRaw.replace(/[^0-9.-]+/g, ""));
    const quantity = !Number.isNaN(numQty) && numQty > 0 ? numQty : null;

    const reporterName = senderPhone
      ? `Relawan SMS (${senderPhone})`
      : `Relawan Lapangan (${code})`;

    const formattedSummary = `[SMS-GATEWAY] Kebutuhan ${needType} ${
      quantity ? `sebanyak ${quantity} ${defaultUnit}` : ""
    }. Keterangan: ${notesRaw.replace(/_/g, " ")}. Posko: ${code}.`;

    return {
      location,
      disasterType,
      severity,
      needsSummary: formattedSummary,
      quantity,
      unit: defaultUnit,
      reporterName,
      coordinates,
      confidenceScore: 0.95,
      parserVersion: "v1.0-standard-delimiter",
      parseError: null,
      isAccepted: false,
    };
  }

  // Fallback for freeform SMS message
  const upperRaw = clean.toUpperCase();
  let fallbackDisaster = "Darurat Bencana";
  for (const [kw, name] of Object.entries(DISASTER_KEYWORDS)) {
    if (upperRaw.includes(kw)) {
      fallbackDisaster = name;
      break;
    }
  }

  const isCritical =
    upperRaw.includes("KORBAN") ||
    upperRaw.includes("TOLONG") ||
    upperRaw.includes("DARURAT") ||
    upperRaw.includes("PUTUS");

  return {
    location: "Lokasi Perlu Konfirmasi Lapangan",
    disasterType: fallbackDisaster,
    severity: isCritical ? "critical" : "major",
    needsSummary: `[SMS Bebas] ${clean || "Pesan SMS tanpa format terstruktur"}`,
    quantity: null,
    unit: null,
    reporterName: senderPhone ? `Pengirim SMS (${senderPhone})` : "Pengirim SMS",
    coordinates: null,
    confidenceScore: 0.4,
    parserVersion: "v1.0-freeform-fallback",
    parseError: "Format tidak sesuai standar LAPOR#KODE#KEBUTUHAN#JUMLAH#KETERANGAN",
    isAccepted: false,
  };
}
