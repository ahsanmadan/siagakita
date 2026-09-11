import type { CrisisStatus } from "@/lib/types";
import type { MapPoint, VolcanoEruptionReport, VolcanoCctv, VolcanoObservationReport } from "@/components/crisis-map";
import { INDONESIAN_ACTIVE_VOLCANOES, type IndonesianVolcano } from "@/data/volcanoes";
import { parseTimeWithTimezone } from "@/lib/utils";

export interface LiveDisasterAlert {
  id: string;
  source: "BMKG" | "USGS" | "PVMBG";
  sourceUrl: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status: CrisisStatus;
  kind: "Gempa" | "Gunung Api";
  isErupting?: boolean;
  eruptionReport?: VolcanoEruptionReport;
  observationReport?: VolcanoObservationReport;
  cctvList?: VolcanoCctv[];
  hasCctv?: boolean;
  cctvCount?: number;
  detail: string;
  updatedAt: string;
  timestampMs: number;
  meta: {
    magnitude?: string;
    depth?: string;
    feltScale?: string;
    tsunamiPotential?: string;
    shakemapUrl?: string;
    volcanoLevel?: string;
    dangerRadiusKm?: number;
    elevationMeters?: number;
    isErupting?: boolean;
    eruptionReport?: VolcanoEruptionReport;
    observationReport?: VolcanoObservationReport;
    cctvList?: VolcanoCctv[];
    imageUrl?: string;
  };
}

export type PublicExternalAlert = LiveDisasterAlert;

type BmkgGempaItem = {
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
  Shakemap?: string;
};

type BmkgApiResponse = {
  Infogempa?: {
    gempa?: BmkgGempaItem | BmkgGempaItem[];
  };
};

function parseBmkgCoordinate(value: string | undefined) {
  if (!value) return null;
  const [latPart, lonPart] = value.split(",").map((part) => Number(part.trim()));
  if (
    !Number.isFinite(latPart) ||
    !Number.isFinite(lonPart) ||
    latPart < -12 ||
    latPart > 7 ||
    lonPart < 94 ||
    lonPart > 142
  ) return null;
  return { latitude: latPart, longitude: lonPart };
}

function statusFromMagnitude(value: string | undefined): CrisisStatus {
  const magnitude = Number(value);
  if (!Number.isFinite(magnitude)) return "warning";
  if (magnitude >= 6.5) return "critical";
  if (magnitude >= 6.0) return "major";
  if (magnitude >= 5.5) return "warning";
  return "safe";
}

/**
 * Filter Gempa: Mengakomodasi gempa telemetri BMKG (M >= 5.0)
 * atau yang memiliki potensi tsunami atau dirasakan warga.
 */
function isDisasterThreatEarthquake(
  mag: number,
  depthKm: number,
  wilayah: string,
  dirasakan?: string,
  potensi?: string,
): boolean {
  const isTsunamiThreat = (potensi ?? "").toLowerCase().includes("berpotensi tsunami");
  if (isTsunamiThreat) return true;

  if (mag >= 5.0) return true;
  if (dirasakan && dirasakan.trim().length > 0) return true;

  return false;
}

function evaluateEarthquakeStatus(
  mag: number,
  depthKm: number,
  isTsunami: boolean,
  wilayah: string = "",
  dirasakan?: string,
): CrisisStatus {
  // 1. Bahaya Tinggi (critical): Peringatan Tsunami atau Gempa sangat besar M >= 6.5
  if (isTsunami || mag >= 6.5) return "critical";

  // Gempa M >= 6.0 sangat dangkal (<= 20 km) di daratan
  const isLandNear = !wilayah.toLowerCase().includes("laut") && !wilayah.toLowerCase().includes("selat");
  if (mag >= 6.0 && depthKm <= 20 && isLandNear) return "critical";

  // Kerusakan intensitas MMI tinggi terbukti nyata (MMI VI ke atas)
  if (/(?:VI|VII|VIII|IX|X)\s*MMI/i.test(dirasakan ?? "")) return "critical";

  // 2. Terdampak Berat (major): Gempa M 6.0 - 6.4 di laut/darat atau M 5.7+ sangat dangkal di daratan
  if (mag >= 6.0) return "major";
  if (mag >= 5.6 && depthKm <= 15 && isLandNear) return "major";
  if (/(?:V)\s*MMI/i.test(dirasakan ?? "")) return "major";

  // 3. Perlu Waspada (warning): Gempa M 5.5 - 5.9 atau ada laporan dirasakan nyata
  if (mag >= 5.5) return "warning";
  if (dirasakan && /(?:III|IV)\s*MMI/i.test(dirasakan)) return "warning";
  if (depthKm <= 30 && isLandNear) return "warning";

  // 4. Relatif Aman (safe): Gempa M 5.0 - 5.4 di laut lepas tanpa ancaman tsunami
  return "safe";
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "baru diperbarui";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "baru diperbarui";

  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.round(hours / 24)} hari lalu`;
}

function formatIndonesianDate(date = new Date()): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

// In-memory server cache to protect upstream BMKG rate-limit
let cachedAlerts: {
  earthquakes: LiveDisasterAlert[];
  volcanoes: LiveDisasterAlert[];
  latestQuake: LiveDisasterAlert | null;
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 45 * 1000; // 45 seconds cache

/**
 * Fetch BMKG data with timeout and fallback
 */
async function fetchBmkgEndpoint(endpoint: string): Promise<BmkgGempaItem[]> {
  try {
    const res = await fetch(`https://data.bmkg.go.id/DataMKG/TEWS/${endpoint}`, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://data.bmkg.go.id/",
      },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 30 },
    });

    if (!res.ok) return [];
    const json = (await res.json()) as BmkgApiResponse;
    const raw = json.Infogempa?.gempa;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  } catch (err) {
    console.warn(`BMKG endpoint ${endpoint} failed:`, err instanceof Error ? err.message : String(err));
    return [];
  }
}

/**
 * Fallback to USGS if BMKG is unavailable
 */
async function fetchUsgsFallback(): Promise<LiveDisasterAlert[]> {
  try {
    const url =
      "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=5.0&minlatitude=-11.5&maxlatitude=6.5&minlongitude=94.5&maxlongitude=141.5&limit=15";
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data = await res.json();
    const features = data.features ?? [];
    const filtered: LiveDisasterAlert[] = [];

    for (const f of features) {
      const coords = f.geometry?.coordinates ?? [0, 0, 0];
      const magNum = Number(f.properties?.mag ?? 0);
      const depthKm = Math.round(coords[2] || 10);
      const place = f.properties?.place ?? "Wilayah Indonesia";
      const timeMs = Number(f.properties?.time) || Date.now();

      if (!isDisasterThreatEarthquake(magNum, depthKm, place)) {
        continue;
      }

      filtered.push({
        id: `usgs-${f.id}`,
        source: "USGS" as const,
        sourceUrl: f.properties?.url ?? "https://earthquake.usgs.gov/",
        name: `Gempa M ${magNum.toFixed(1)}`,
        location: place,
        latitude: coords[1],
        longitude: coords[0],
        status: evaluateEarthquakeStatus(magNum, depthKm, false, place),
        kind: "Gempa" as const,
        detail: `Gempa terdeteksi USGS M ${magNum.toFixed(1)}, kedalaman ${depthKm} km. ${place}.`,
        updatedAt: formatRelativeTime(new Date(timeMs).toISOString()),
        timestampMs: timeMs,
        meta: {
          magnitude: String(magNum),
          depth: `${depthKm} km`,
          tsunamiPotential: "Pantau pengumuman BMKG",
        },
      });
    }

    return filtered;
  } catch {
    return [];
  }
}


interface RawMagmaVolcano {
  ga_code?: string;
  ga_nama_gapi?: string;
  ga_kab_gapi?: string;
  ga_prov_gapi?: string;
  ga_elev_gapi?: number;
  ga_lon_gapi?: number;
  ga_lat_gapi?: number;
  ga_status?: number; // 1: Normal, 2: Waspada, 3: Siaga, 4: Awas
  erupt_icon?: boolean;
  has_vona?: boolean;
  noticenumber?: string;
  vona?: Array<{
    no?: number;
    issued?: string;
    issued_time?: string;
    cu_avcode?: string;
    remarks?: string;
    volcanic_act_summ?: string;
    vc_height_text?: string;
  }>;
}

function getMagmaStatusConfig(gaStatus: number | undefined): {
  levelFull: string;
  statusShort: string;
  crisisStatus: CrisisStatus;
  defaultRadiusKm: number;
} {
  switch (gaStatus) {
    case 4:
      return {
        levelFull: "Level IV (Awas)",
        statusShort: "Awas",
        crisisStatus: "critical",
        defaultRadiusKm: 7.0,
      };
    case 3:
      return {
        levelFull: "Level III (Siaga)",
        statusShort: "Siaga",
        crisisStatus: "major",
        defaultRadiusKm: 5.0,
      };
    case 2:
      return {
        levelFull: "Level II (Waspada)",
        statusShort: "Waspada",
        crisisStatus: "warning",
        defaultRadiusKm: 3.0,
      };
    case 1:
    default:
      return {
        levelFull: "Level I (Normal)",
        statusShort: "Normal",
        crisisStatus: "safe",
        defaultRadiusKm: 1.5,
      };
  }
}

// In-memory cache for live Magma ESDM volcanoes
let cachedMagmaVolcanoes: {
  data: LiveDisasterAlert[];
  timestamp: number;
} | null = null;
const MAGMA_CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

/**
 * Normalizes Indonesian Volcanoes from static catalog into LiveDisasterAlert (Fallback)
 */
export function getVolcanoAlerts(): LiveDisasterAlert[] {
  return INDONESIAN_ACTIVE_VOLCANOES.map((v) => ({
    id: `volcano-${v.id}`,
    source: "PVMBG" as const,
    sourceUrl: "https://magma.esdm.go.id/v1",
    name: `${v.name} (${v.statusLevel.replace(/^Level\s+[IVX]+\s+\((.+)\)$/, "$1")})`,
    location: `${v.location}, ${v.province}`,
    latitude: v.latitude,
    longitude: v.longitude,
    status: v.crisisStatus,
    kind: "Gunung Api" as const,
    isErupting: v.isErupting ?? false,
    detail: `${v.statusLevel} (Elevasi ${v.elevationMeters} mdpl). ${v.summary} Rekomendasi: ${v.recommendation}`,
    updatedAt: "Katalog PVMBG",
    timestampMs: Date.now(),
    meta: {
      volcanoLevel: v.statusLevel,
      dangerRadiusKm: v.dangerRadiusKm,
      elevationMeters: v.elevationMeters,
      isErupting: v.isErupting ?? false,
    },
  }));
}

function parseLiveEruptionReports(html: string): Map<string, VolcanoEruptionReport> {
  const reportsByVolcano = new Map<string, VolcanoEruptionReport>();
  const parts = html.split('<div class="timeline-item">');
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const timeMatch = chunk.match(/<div class="timeline-time">\s*<small>([^<]+)<\/small>/i);
    const time = timeMatch ? timeMatch[1].trim() : "";
    const titleMatch = chunk.match(/<p class="timeline-title">\s*<a[^>]*>([^<]+)<\/a>/i);
    const volcanoName = titleMatch ? titleMatch[1].trim() : "";
    const authorMatch = chunk.match(/<p class="timeline-author">\s*Dibuat oleh\s*<a[^>]*>([^<]+)<\/a>/i);
    const author = authorMatch ? authorMatch[1].trim() : "";
    const textMatch = chunk.match(/<p class="timeline-text">([\s\S]*?)<\/p>/i);
    let description = "";
    if (textMatch) {
      description = textMatch[1].replace(/&plusmn;/g, "±").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
    const imgMatch = chunk.match(/<img[^>]+src="([^"]+)"/i);
    const imageUrl = imgMatch && !imgMatch[1].includes("logo") ? imgMatch[1].trim() : undefined;
    const detailMatch = chunk.match(/href="([^"]*gunung-api\/informasi-letusan\/[^"]+)"/i);
    const detailUrl = detailMatch ? detailMatch[1].trim() : undefined;

    const key = volcanoName.toLowerCase().replace(/^(gunung|g\.)\s+/i, "").trim();
    if (key && !reportsByVolcano.has(key)) {
      reportsByVolcano.set(key, {
        time,
        volcanoName,
        author,
        description,
        imageUrl,
        detailUrl,
      });
    }
  }
  return reportsByVolcano;
}

function parseLiveCctvList(html: string): Map<string, VolcanoCctv[]> {
  const cctvMap = new Map<string, VolcanoCctv[]>();
  const regex = /<div class="card card-blog-overlay[^"]*"[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<small class="text-right">([^<]+)<\/small>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const src = m[1];
    const label = m[2].trim();
    const dashIdx = label.indexOf("-");
    const volcName = dashIdx !== -1 ? label.slice(0, dashIdx).trim() : label;
    const locName = dashIdx !== -1 ? label.slice(dashIdx + 1).trim() : "";
    const key = volcName.toLowerCase().replace(/^(gunung|g\.)\s+/i, "").trim();
    if (!cctvMap.has(key)) cctvMap.set(key, []);
    cctvMap.get(key)!.push({
      locationName: locName,
      label,
      imageUrl: src,
    });
  }
  return cctvMap;
}

function parseLiveObservationReports(html: string): Map<string, VolcanoObservationReport> {
  const laporanMap = new Map<string, VolcanoObservationReport>();
  const parts = html.split('<div class="timeline-item">');
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const period = chunk.match(/<div class="timeline-time">\s*<small>([^<]+)<\/small>/i)?.[1]?.trim() ?? "";
    const name = chunk.match(/<p class="timeline-title">\s*<a[^>]*>([^<]+)<\/a>/i)?.[1]?.trim() ?? "";
    const author = chunk.match(/<p class="timeline-author">\s*Dibuat oleh\s*<span[^>]*>([^<]+)<\/span>/i)?.[1]?.trim() ?? "";
    const desc = chunk.match(/<div class="col-xs-12[^"]*">\s*<p>([\s\S]*?)<\/p>/i)?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";
    const detail = chunk.match(/href="([^"]*gunung-api\/laporan\/[^"]+)"/i)?.[1]?.trim();
    const key = name.toLowerCase().replace(/^(gunung|g\.)\s+/i, "").trim();
    if (key && !laporanMap.has(key)) {
      laporanMap.set(key, {
        period,
        volcanoName: name,
        author,
        visualSummary: desc,
        detailUrl: detail,
      });
    }
  }
  return laporanMap;
}

let cachedCctvMap: { timestamp: number; data: Map<string, VolcanoCctv[]> } | null = null;
const CCTV_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export async function fetchLiveCctvMap(): Promise<Map<string, VolcanoCctv[]>> {
  const now = Date.now();
  if (cachedCctvMap && now - cachedCctvMap.timestamp < CCTV_CACHE_TTL_MS) {
    return cachedCctvMap.data;
  }

  try {
    const res = await fetch("https://magma.esdm.go.id/v1/gunung-api/cctv", {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Referer: "https://magma.esdm.go.id/",
      },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return cachedCctvMap?.data ?? new Map();
    }

    const html = await res.text();
    const map = parseLiveCctvList(html);
    cachedCctvMap = { timestamp: now, data: map };
    return map;
  } catch (err) {
    console.warn("fetchLiveCctvMap failed:", err);
    return cachedCctvMap?.data ?? new Map();
  }
}

export async function fetchVolcanoCctvList(volcanoNameOrKey: string): Promise<VolcanoCctv[]> {
  const map = await fetchLiveCctvMap();
  const key = volcanoNameOrKey.toLowerCase().replace(/^(gunung|g\.)\s+/i, "").trim();
  return map.get(key) ?? [];
}

const KNOWN_CCTV_VOLCANO_KEYS = new Set([
  "anak krakatau", "krakatau", "semeru", "ibu", "bromo", "dieng",
  "guntur", "ijen", "papandayan", "dempo", "kerinci", "sinabung"
]);

/**
 * Fetches and parses 100% REAL-TIME telemetry directly from official Magma ESDM
 * (https://magma.esdm.go.id/v1). Monitors all 69 active volcanoes in Indonesia,
 * with live eruption alerts and periodic observation reports from PVMBG.
 * CCTV feeds are decoupled and served on-demand to keep polling payload < 30 KB.
 */
export async function fetchLiveMagmaVolcanoes(): Promise<LiveDisasterAlert[]> {
  const now = Date.now();
  if (cachedMagmaVolcanoes && now - cachedMagmaVolcanoes.timestamp < MAGMA_CACHE_TTL_MS) {
    return cachedMagmaVolcanoes.data;
  }

  try {
    const [resMain, resLetusan, resLaporan] = await Promise.all([
      fetch("https://magma.esdm.go.id/v1", {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Referer: "https://magma.esdm.go.id/",
        },
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 60 },
      }),
      fetch("https://magma.esdm.go.id/v1/gunung-api/informasi-letusan", {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Referer: "https://magma.esdm.go.id/",
        },
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 60 },
      }).catch(() => null),
      fetch("https://magma.esdm.go.id/v1/gunung-api/laporan", {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Referer: "https://magma.esdm.go.id/",
        },
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 60 },
      }).catch(() => null),
    ]);

    if (!resMain.ok) {
      console.warn(`Magma ESDM returned HTTP ${resMain.status}, using catalog fallback.`);
      return getVolcanoAlerts();
    }

    const html = await resMain.text();
    const markerToken = "var markersGunungApi = [";
    const startIdx = html.indexOf(markerToken);
    if (startIdx === -1) {
      console.warn("markersGunungApi not found in Magma ESDM HTML, using catalog fallback.");
      return getVolcanoAlerts();
    }

    const jsonStart = startIdx + "var markersGunungApi = ".length;
    let depth = 0;
    let jsonEnd = -1;
    for (let i = jsonStart; i < html.length; i++) {
      if (html[i] === "[") {
        depth++;
      } else if (html[i] === "]") {
        depth--;
        if (depth === 0) {
          jsonEnd = i + 1;
          break;
        }
      }
    }

    if (jsonEnd === -1) {
      console.warn("Could not find matching closing bracket for markersGunungApi.");
      return getVolcanoAlerts();
    }

    const rawArray: RawMagmaVolcano[] = JSON.parse(html.slice(jsonStart, jsonEnd));
    if (!Array.isArray(rawArray) || rawArray.length === 0) {
      return getVolcanoAlerts();
    }

    let eruptionReports = new Map<string, VolcanoEruptionReport>();
    if (resLetusan && resLetusan.ok) {
      try {
        eruptionReports = parseLiveEruptionReports(await resLetusan.text());
      } catch (e) {
        console.warn("Failed parsing letusan HTML:", e);
      }
    }

    let laporanMap = new Map<string, VolcanoObservationReport>();
    if (resLaporan && resLaporan.ok) {
      try {
        laporanMap = parseLiveObservationReports(await resLaporan.text());
      } catch (e) {
        console.warn("Failed parsing Laporan HTML:", e);
      }
    }

    const liveAlerts: LiveDisasterAlert[] = rawArray.flatMap((v) => {
      const latitude = Number(v.ga_lat_gapi);
      const longitude = Number(v.ga_lon_gapi);
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -12 ||
        latitude > 7 ||
        longitude < 94 ||
        longitude > 142
      ) return [];

      const statusCfg = getMagmaStatusConfig(v.ga_status);
      const isErupting = Boolean(v.erupt_icon);
      const latestVona = Array.isArray(v.vona) && v.vona.length > 0 ? v.vona[0] : null;

      const locationParts = [v.ga_kab_gapi, v.ga_prov_gapi].filter(Boolean);
      const location = locationParts.join(", ") || "Indonesia";

      const matchKey = (v.ga_nama_gapi || "").toLowerCase().replace(/^(gunung|g\.)\s+/i, "").trim();
      const eruptionReport = eruptionReports.get(matchKey);
      const observationReport = laporanMap.get(matchKey);
      const hasCctv = cachedCctvMap?.data ? cachedCctvMap.data.has(matchKey) : KNOWN_CCTV_VOLCANO_KEYS.has(matchKey);
      const cctvCount = cachedCctvMap?.data.get(matchKey)?.length ?? (KNOWN_CCTV_VOLCANO_KEYS.has(matchKey) ? 1 : 0);

      let detailActivity = isErupting
        ? "SEDANG ERUPSI / LETUSAN AKTIF."
        : "Aktivitas vulkanik tergolong stabil dalam tingkat status ini.";

      if (eruptionReport?.description) {
        detailActivity = `${detailActivity} Laporan Terkini (${eruptionReport.time}): ${eruptionReport.description}`;
      } else if (observationReport?.visualSummary) {
        detailActivity = `${detailActivity} Pengamatan Visual (${observationReport.period || "Terbaru"}): ${observationReport.visualSummary}`;
      } else if (latestVona?.remarks && latestVona.remarks.trim().length > 0) {
        detailActivity += ` VONA: ${latestVona.remarks.trim()}`;
      } else if (latestVona?.volcanic_act_summ && latestVona.volcanic_act_summ.trim().length > 0) {
        detailActivity += ` Pengamatan: ${latestVona.volcanic_act_summ.trim()}`;
      }

      const detail = `${statusCfg.levelFull} (Elevasi ${v.ga_elev_gapi ?? 0} mdpl). ${detailActivity} Rekomendasi PVMBG: Masyarakat dan pengunjung tidak beraktivitas dalam radius bahaya ${statusCfg.defaultRadiusKm} km dari kawah aktif.`;

      const id = `volcano-${(v.ga_code || v.ga_nama_gapi || "unknown").toLowerCase().replace(/\s+/g, "-")}`;
      const name = `G. ${v.ga_nama_gapi || "Gunung Api"}`;

      const timeIso = latestVona?.issued_time ? new Date(latestVona.issued_time).toISOString() : new Date().toISOString();
      const updatedAtText = eruptionReport?.time
        ? eruptionReport.time
        : observationReport?.period
          ? observationReport.period
          : latestVona?.issued_time
            ? formatRelativeTime(timeIso)
            : "";

      const primaryImageUrl = eruptionReport?.imageUrl;
      const eruptionTimeMs = eruptionReport?.description
        ? parseTimeWithTimezone(eruptionReport.description, new Date(now))
        : eruptionReport?.time
          ? parseTimeWithTimezone(eruptionReport.time, new Date(now))
          : undefined;

      const observationTimeMs = observationReport?.period
        ? parseTimeWithTimezone(observationReport.period, new Date(now))
        : undefined;

      const vonaTimeMs = latestVona?.issued_time ? new Date(latestVona.issued_time).getTime() : undefined;

      // Real volcano activity timestamp: eruption, VONA, or observation report.
      // Quiet volcanoes with no recent activity have 0.
      const volcanoTimestampMs = eruptionTimeMs ?? vonaTimeMs ?? observationTimeMs ?? 0;

      return [{
        id,
        source: "PVMBG" as const,
        sourceUrl: eruptionReport?.detailUrl || observationReport?.detailUrl || "https://magma.esdm.go.id/v1",
        name,
        location,
        latitude,
        longitude,
        status: statusCfg.crisisStatus,
        kind: "Gunung Api" as const,
        isErupting,
        eruptionReport,
        observationReport,
        hasCctv,
        cctvCount,
        detail,
        updatedAt: updatedAtText,
        timestampMs: volcanoTimestampMs,
        meta: {
          volcanoLevel: statusCfg.levelFull,
          dangerRadiusKm: statusCfg.defaultRadiusKm,
          elevationMeters: Number(v.ga_elev_gapi) || 0,
          isErupting,
          eruptionReport,
          observationReport,
          hasCctv,
          cctvCount,
          imageUrl: primaryImageUrl,
        },
      }];
    });

    // Urutan prioritas Gunung Api:
    // 1. Ada laporan letusan/aktivitas terkini (eruptionReport) diurutkan dari waktu paling baru
    // 2. Waktu aktivitas / timestamp terbaru
    // 3. Sedang erupsi aktif (isErupting = true)
    // 4. Status level tertinggi (critical -> major -> warning -> safe)
    // 5. Nama alfabetis
    const statusWeight: Record<CrisisStatus, number> = {
      critical: 4,
      major: 3,
      warning: 2,
      safe: 1,
    };

    liveAlerts.sort((a, b) => {
      // 1. Aktivitas letusan terkini (erupsi) dibanding berdasarkan waktu letusan terbaru
      const hasEruptA = Boolean(a.eruptionReport?.time || a.eruptionReport?.description);
      const hasEruptB = Boolean(b.eruptionReport?.time || b.eruptionReport?.description);
      if (hasEruptA && hasEruptB) {
        const timeA = a.timestampMs || 0;
        const timeB = b.timestampMs || 0;
        if (timeA !== timeB) return timeB - timeA;
      } else if (hasEruptA !== hasEruptB) {
        return hasEruptB ? 1 : -1;
      }

      // 2. Waktu aktivitas vulkanik terbaru (timestampMs)
      const timeA = a.timestampMs || 0;
      const timeB = b.timestampMs || 0;
      if (timeA !== timeB) {
        return timeB - timeA;
      }

      if (a.isErupting !== b.isErupting) {
        return (b.isErupting ? 1 : 0) - (a.isErupting ? 1 : 0);
      }

      const weightDiff = (statusWeight[b.status] || 0) - (statusWeight[a.status] || 0);
      if (weightDiff !== 0) return weightDiff;

      return a.name.localeCompare(b.name);
    });

    cachedMagmaVolcanoes = {
      data: liveAlerts,
      timestamp: now,
    };

    return liveAlerts;
  } catch (err) {
    console.warn("fetchLiveMagmaVolcanoes error:", err instanceof Error ? err.message : String(err));
    return getVolcanoAlerts();
  }
}

/**
 * Aggregates live earthquakes from BMKG with USGS failover
 */
export async function getLiveEarthquakeAlerts(): Promise<{
  latest: LiveDisasterAlert | null;
  recent: LiveDisasterAlert[];
}> {
  const [autoGempaRaw, terkiniRaw, dirasakanRaw] = await Promise.all([
    fetchBmkgEndpoint("autogempa.json"),
    fetchBmkgEndpoint("gempaterkini.json"),
    fetchBmkgEndpoint("gempadirasakan.json"),
  ]);

  const allBmkg = [...autoGempaRaw, ...terkiniRaw, ...dirasakanRaw];

  if (allBmkg.length === 0) {
    // Failover to USGS
    const usgsAlerts = await fetchUsgsFallback();
    return {
      latest: usgsAlerts[0] ?? null,
      recent: usgsAlerts,
    };
  }

  const seenIds = new Set<string>();
  const alerts: LiveDisasterAlert[] = [];

  for (const item of allBmkg) {
    const coords = parseBmkgCoordinate(item.Coordinates);
    if (!coords) continue;

    const uniqueId = `bmkg-${item.DateTime ?? `${coords.latitude}-${coords.longitude}`}`;
    if (seenIds.has(uniqueId)) continue;
    seenIds.add(uniqueId);

    const mag = item.Magnitude ?? "5.0";
    const magNumber = Number(mag);
    const depth = item.Kedalaman ?? "10 km";
    const depthMatch = depth.match(/(\d+)/);
    const depthKm = depthMatch ? Number(depthMatch[1]) : 10;
    const wilayah = item.Wilayah ?? "Wilayah Indonesia";
    const dirasakan = item.Dirasakan;
    const potensi = item.Potensi;

    // FILTER KETAT: Hanya loloskan gempa yang memiliki potensi bahaya bencana nyata
    if (!isDisasterThreatEarthquake(magNumber, depthKm, wilayah, dirasakan, potensi)) {
      continue;
    }

    const isTsunami = (potensi ?? "").toLowerCase().includes("berpotensi tsunami");
    const status = evaluateEarthquakeStatus(magNumber, depthKm, isTsunami, wilayah, dirasakan);

    const potential = potensi ? ` ${potensi}.` : "";
    const felt = dirasakan ? ` Dirasakan: ${dirasakan}.` : "";
    const shakemap = item.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${item.Shakemap}` : undefined;
    const timeIso = item.DateTime ?? new Date().toISOString();

    alerts.push({
      id: uniqueId,
      source: "BMKG",
      sourceUrl: "https://data.bmkg.go.id/gempabumi/",
      name: `Gempa M ${mag}`,
      location: wilayah,
      latitude: coords.latitude,
      longitude: coords.longitude,
      status,
      kind: "Gempa",
      detail: `Gempa bumi M ${mag}, kedalaman ${depth}, ${wilayah}.${potential}${felt}`.trim(),
      updatedAt: formatRelativeTime(timeIso),
      timestampMs: new Date(timeIso).getTime() || Date.now(),
      meta: {
        magnitude: mag,
        depth,
        feltScale: dirasakan,
        tsunamiPotential: potensi,
        shakemapUrl: shakemap,
      },
    });
  }

  // Sort by timestamp descending
  alerts.sort((a, b) => b.timestampMs - a.timestampMs);

  return {
    latest: alerts[0] ?? null,
    recent: alerts.slice(0, 15),
  };
}

/**
 * Returns comprehensive live alerts (Earthquakes + Volcanoes)
 * Cached with SWR in memory
 */
export async function getComprehensiveLiveAlerts(): Promise<{
  latestEarthquake: LiveDisasterAlert | null;
  earthquakes: LiveDisasterAlert[];
  volcanoes: LiveDisasterAlert[];
  criticalVolcanoes: LiveDisasterAlert[];
  tickerSummaries: string[];
}> {
  const now = Date.now();
  if (cachedAlerts && now - cachedAlerts.timestamp < CACHE_TTL_MS) {
    const volcanoes = cachedAlerts.volcanoes;
    const criticalVolcanoes = volcanoes.filter(
      (v) => v.status === "critical" || v.status === "major" || Boolean(v.isErupting),
    );
    return {
      latestEarthquake: cachedAlerts.latestQuake,
      earthquakes: cachedAlerts.earthquakes,
      volcanoes,
      criticalVolcanoes,
      tickerSummaries: buildTickerSummaries(cachedAlerts.latestQuake, criticalVolcanoes),
    };
  }

  const [{ latest, recent }, volcanoes] = await Promise.all([
    getLiveEarthquakeAlerts(),
    fetchLiveMagmaVolcanoes(),
  ]);

  cachedAlerts = {
    earthquakes: recent,
    volcanoes,
    latestQuake: latest,
    timestamp: now,
  };

  const criticalVolcanoes = volcanoes.filter(
    (v) => v.status === "critical" || v.status === "major" || Boolean(v.isErupting),
  );

  return {
    latestEarthquake: latest,
    earthquakes: recent,
    volcanoes,
    criticalVolcanoes,
    tickerSummaries: buildTickerSummaries(latest, criticalVolcanoes),
  };
}

function buildTickerSummaries(
  latestQuake: LiveDisasterAlert | null,
  criticalVolcanoes: LiveDisasterAlert[],
): string[] {
  const items: string[] = [];

  if (latestQuake) {
    items.push(
      `🔴 GEMPA TERKINI BMKG: M ${latestQuake.meta.magnitude} · ${latestQuake.location} (${latestQuake.meta.depth}) · ${latestQuake.meta.tsunamiPotential || "Tidak berpotensi tsunami"}`,
    );
  }

  for (const volc of criticalVolcanoes.slice(0, 4)) {
    const eruptTag = volc.isErupting ? " (SEDANG ERUPSI)" : "";
    items.push(
      `🌋 PVMBG: ${volc.name}${eruptTag} (${volc.location}) · Radius bahaya ${volc.meta.dangerRadiusKm ?? 3} km dari kawah aktif`,
    );
  }

  items.push("📢 SiagaKita: Hubungi Call Center Darurat BNPB 117 atau BPBD setempat untuk bantuan evakuasi.");
  return items;
}

// Backward-compatible single alert fetcher
export async function getBmkgEarthquakeAlert(): Promise<PublicExternalAlert | null> {
  const live = await getComprehensiveLiveAlerts();
  return live.latestEarthquake;
}

/**
 * Aggregates all external alerts (BMKG Earthquakes + PVMBG Volcanoes)
 * with pre-computed MapLibre MapPoints and ticker summaries.
 */
export async function getAggregatedExternalAlerts(): Promise<{
  latestEarthquake: LiveDisasterAlert | null;
  earthquakes: LiveDisasterAlert[];
  volcanoes: LiveDisasterAlert[];
  criticalVolcanoes: LiveDisasterAlert[];
  tickerSummaries: string[];
  sources: string[];
  mapPoints: MapPoint[];
}> {
  const alerts = await getComprehensiveLiveAlerts();

  const quakePoints: MapPoint[] = alerts.earthquakes.map((q) => ({
    id: q.id,
    name: q.name,
    location: q.location,
    latitude: q.latitude,
    longitude: q.longitude,
    status: q.status,
    kind: "Gempa" as const,
    detail: q.detail,
    updatedAt: q.updatedAt,
    timestampMs: q.timestampMs,
    source: q.source,
    sourceUrl: q.sourceUrl,
  }));

  const volcanoPoints: MapPoint[] = alerts.volcanoes.map((v) => ({
    id: v.id,
    name: v.name,
    location: v.location,
    latitude: v.latitude,
    longitude: v.longitude,
    status: v.status,
    kind: "Gunung Api" as const,
    isErupting: v.isErupting,
    eruptionReport: v.eruptionReport,
    observationReport: v.observationReport,
    cctvList: v.cctvList,
    hasCctv: v.hasCctv,
    cctvCount: v.cctvCount,
    detail: v.detail,
    updatedAt: v.updatedAt,
    timestampMs: v.timestampMs,
    source: v.source,
    sourceUrl: v.sourceUrl,
  }));

  return {
    latestEarthquake: alerts.latestEarthquake,
    earthquakes: alerts.earthquakes,
    volcanoes: alerts.volcanoes,
    criticalVolcanoes: alerts.criticalVolcanoes,
    tickerSummaries: alerts.tickerSummaries,
    sources: ["BMKG", "PVMBG/Magma Indonesia", "USGS (Failover)"],
    mapPoints: [...quakePoints, ...volcanoPoints],
  };
}
