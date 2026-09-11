import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getInitials = (str: string): string => {
  if (typeof str !== "string" || !str.trim()) return "?";

  return (
    str
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  );
};

export function formatCurrency(
  amount: number,
  opts?: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    noDecimals?: boolean;
  },
) {
  const { currency = "IDR", locale = "id-ID", minimumFractionDigits, maximumFractionDigits, noDecimals } = opts ?? {};

  const formatOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    minimumFractionDigits: noDecimals ? 0 : minimumFractionDigits,
    maximumFractionDigits: noDecimals ? 0 : maximumFractionDigits,
  };

  return new Intl.NumberFormat(locale, formatOptions).format(amount);
}

const INDONESIAN_MONTH_MAP: Record<string, number> = {
  januari: 0, jan: 0,
  februari: 1, pebruari: 1, feb: 1,
  maret: 2, mar: 2,
  april: 3, apr: 3,
  mei: 4, may: 4,
  juni: 5, jun: 5,
  juli: 6, jul: 6,
  agustus: 7, ags: 7, agu: 7,
  september: 8, sep: 8, sept: 8,
  oktober: 9, okt: 9,
  november: 10, nopember: 10, nov: 10,
  desember: 11, des: 11,
};

export function parseTimeWithTimezone(timeStr: string, baseDate = new Date()): number | undefined {
  if (!timeStr) return undefined;

  // 1. Check if string contains standard ISO date
  const isoParsed = new Date(timeStr).getTime();
  if (!Number.isNaN(isoParsed) && isoParsed > 0 && /^\d{4}-\d{2}-\d{2}/.test(timeStr.trim())) {
    return isoParsed;
  }

  // 2. Check if string contains full Indonesian date: e.g. "10 September 2026, pukul 06:21 WIT" or "10/09/2026 06:21"
  const fullDateMatch = timeStr.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})[^\d\n]*?(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*(WIB|WITA|WIT)?/i);
  if (fullDateMatch) {
    const day = parseInt(fullDateMatch[1], 10);
    const monthKey = fullDateMatch[2].toLowerCase();
    const month = INDONESIAN_MONTH_MAP[monthKey];
    const year = parseInt(fullDateMatch[3], 10);
    const hours = parseInt(fullDateMatch[4], 10);
    const minutes = parseInt(fullDateMatch[5], 10);
    const seconds = fullDateMatch[6] ? parseInt(fullDateMatch[6], 10) : 0;
    const tz = (fullDateMatch[7] || "WIB").toUpperCase();
    const tzOffsetMinutes = tz === "WIT" ? 540 : tz === "WITA" ? 480 : 420;

    if (month !== undefined && !Number.isNaN(day) && !Number.isNaN(year)) {
      return Date.UTC(year, month, day, hours, minutes, seconds) - tzOffsetMinutes * 60 * 1000;
    }
  }

  // 3. Check for observation report period: "Periode 00:00-06:00 WIB" -> take end time "06:00 WIB"
  const periodMatch = timeStr.match(/(?:periode\s*)?(\d{1,2})[:.](\d{2})\s*-\s*(\d{1,2})[:.](\d{2})\s*(WIB|WITA|WIT)?/i);
  let hours: number;
  let minutes: number;
  let seconds = 0;
  let tz = "WIB";

  if (periodMatch) {
    hours = parseInt(periodMatch[3], 10);
    minutes = parseInt(periodMatch[4], 10);
    tz = (periodMatch[5] || "WIB").toUpperCase();
  } else {
    // 4. Standard time: e.g. "06:21 WIT", "6.21 WIT", "18:41 WIB", "17:00"
    const timeMatch = timeStr.match(/(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*(WIB|WITA|WIT)?/i);
    if (!timeMatch) return undefined;
    hours = parseInt(timeMatch[1], 10);
    minutes = parseInt(timeMatch[2], 10);
    seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    tz = (timeMatch[4] || "WIB").toUpperCase();
  }

  const tzOffsetMinutes = tz === "WIT" ? 540 : tz === "WITA" ? 480 : 420;

  // Compute local date in the target Indonesian timezone
  const localTimeMs = baseDate.getTime() + tzOffsetMinutes * 60 * 1000;
  const localDate = new Date(localTimeMs);
  const localYear = localDate.getUTCFullYear();
  const localMonth = localDate.getUTCMonth();
  const localDay = localDate.getUTCDate();

  let targetUtcMs = Date.UTC(localYear, localMonth, localDay, hours, minutes, seconds) - tzOffsetMinutes * 60 * 1000;

  // If time is in the future by > 15 minutes, it occurred yesterday in that timezone
  if (targetUtcMs > baseDate.getTime() + 15 * 60 * 1000) {
    targetUtcMs -= 24 * 60 * 60 * 1000;
  }

  return targetUtcMs;
}

export function getPointTimestamp(point: {
  timestampMs?: number;
  updatedAt?: string;
  kind?: string;
  isErupting?: boolean;
  eruptionReport?: { time?: string; description?: string };
  observationReport?: { period?: string };
}): number {
  if (point.eruptionReport?.description) {
    const fromDesc = parseTimeWithTimezone(point.eruptionReport.description);
    if (fromDesc) return fromDesc;
  }

  if (point.eruptionReport?.time) {
    const fromTime = parseTimeWithTimezone(point.eruptionReport.time);
    if (fromTime) return fromTime;
  }

  if (typeof point.timestampMs === "number" && !Number.isNaN(point.timestampMs) && point.timestampMs > 0) {
    return point.timestampMs;
  }

  if (point.observationReport?.period) {
    const fromPeriod = parseTimeWithTimezone(point.observationReport.period);
    if (fromPeriod) return fromPeriod;
  }

  if (point.updatedAt) {
    const parsedTime = parseTimeWithTimezone(point.updatedAt);
    if (parsedTime) return parsedTime;

    const parsed = new Date(point.updatedAt).getTime();
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;

    const minuteMatch = point.updatedAt.match(/(\d+)\s*menit\s*lalu/i);
    if (minuteMatch) return Date.now() - Number(minuteMatch[1]) * 60 * 1000;

    const hourMatch = point.updatedAt.match(/(\d+)\s*jam\s*lalu/i);
    if (hourMatch) return Date.now() - Number(hourMatch[1]) * 60 * 60 * 1000;

    const dayMatch = point.updatedAt.match(/(\d+)\s*hari\s*lalu/i);
    if (dayMatch) return Date.now() - Number(dayMatch[1]) * 24 * 60 * 60 * 1000;

    if (/baru saja/i.test(point.updatedAt)) return Date.now();
  }
  return 0;
}
