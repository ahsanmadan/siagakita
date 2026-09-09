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

export function getPointTimestamp(point: { timestampMs?: number; updatedAt?: string }): number {
  if (typeof point.timestampMs === "number" && !Number.isNaN(point.timestampMs) && point.timestampMs > 0) {
    return point.timestampMs;
  }
  if (point.updatedAt) {
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
