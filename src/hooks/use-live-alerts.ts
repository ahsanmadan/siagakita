"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { MapPoint } from "@/components/crisis-map";

const snapshotKey = "siagakita.public-alerts.v1";
const staleAfterMs = 5 * 60_000;
const expiredAfterMs = 30 * 60_000;

type LiveAlertsSnapshot = {
  version: 1;
  savedAt: number;
  points: MapPoint[];
  tickerSummaries: string[];
};

type ConnectionStatus = "online" | "slow" | "offline";
type DataAge = "fresh" | "stale" | "expired";

function isSnapshot(value: unknown): value is LiveAlertsSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<LiveAlertsSnapshot>;
  return snapshot.version === 1 && Number.isFinite(snapshot.savedAt) && Array.isArray(snapshot.points) &&
    snapshot.points.every((point) => point && typeof point.id === "string" && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) &&
    Array.isArray(snapshot.tickerSummaries);
}

function readSnapshot() {
  try {
    const value = localStorage.getItem(snapshotKey);
    if (!value) return null;
    const parsed: unknown = JSON.parse(value);
    return isSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function connectionStatus(): ConnectionStatus {
  if (!navigator.onLine) return "offline";
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
  return connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g" ? "slow" : "online";
}

export interface LiveAlertsPayload {
  timestamp: string;
  sources: string[];
  earthquakes: {
    autoGempa: unknown | null;
    recentCount: number;
    latest: unknown | null;
  };
  volcanoes: {
    totalMonitored: number;
    criticalCount: number;
    list: unknown[];
  };
  mapPoints: MapPoint[];
  tickerSummaries: string[];
}

export interface UseLiveAlertsOptions {
  initialPoints?: MapPoint[];
  initialTickerSummaries?: string[];
  pollIntervalMs?: number;
  enabled?: boolean;
}

export function useLiveAlerts({
  initialPoints = [],
  initialTickerSummaries = [],
  pollIntervalMs = 30_000,
  enabled = true,
}: UseLiveAlertsOptions = {}) {
  const [externalPoints, setExternalPoints] = useState<MapPoint[]>(initialPoints);
  const [tickerSummaries, setTickerSummaries] = useState<string[]>(initialTickerSummaries);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [cachedSnapshot, setCachedSnapshot] = useState<LiveAlertsSnapshot | null>(null);
  const [isUsingCachedData, setIsUsingCachedData] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<ConnectionStatus>("online");
  const [now, setNow] = useState(() => Date.now());

  const seenIdsRef = useRef<Set<string>>(new Set(initialPoints.map((p) => p.id)));
  const isMountedRef = useRef(true);
  const lastSyncTimestampRef = useRef<number>(0);

  const fetchLiveAlerts = useCallback(async (isManual = false) => {
    if (!enabled) return;

    let timeout: number | undefined;
    try {
      setIsLiveSyncing(true);
      const controller = new AbortController();
      timeout = window.setTimeout(() => controller.abort(), 12_000);
      const res = await fetch("/api/alerts/live", {
        headers: { "Accept": "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal memuat telemetri bencana.`);
      }

      const data: LiveAlertsPayload = await res.json();
      if (!isMountedRef.current) return;

      const newMapPoints = data.mapPoints || [];
      const newTickers = data.tickerSummaries || [];

      // Check for newly detected alerts to notify user in real time
      const newlyDetected: MapPoint[] = [];
      newMapPoints.forEach((point) => {
        if (!seenIdsRef.current.has(point.id)) {
          seenIdsRef.current.add(point.id);
          newlyDetected.push(point);
        }
      });

      // If this is a background poll (not initial mount) and new critical points exist, trigger sonner toast
      if (lastSyncTimestampRef.current > 0 && newlyDetected.length > 0) {
        newlyDetected.forEach((p) => {
          if (p.kind === "Gempa") {
            toast.warning(`Peringatan Gempa Baru: ${p.name}`, {
              description: `${p.location}. ${p.detail}`,
              duration: 8000,
            });
          } else if (p.kind === "Gunung Api" && (p.status === "critical" || p.status === "major")) {
            toast.warning(`Aktivitas Vulkanik: ${p.name}`, {
              description: `${p.location}. ${p.detail}`,
              duration: 8000,
            });
          }
        });
      }

      setExternalPoints(newMapPoints);
      if (newTickers.length > 0) {
        setTickerSummaries(newTickers);
      }
      setLastSyncTime(new Date());
      setSyncError(null);
      setIsUsingCachedData(false);
      lastSyncTimestampRef.current = Date.now();

      const snapshot: LiveAlertsSnapshot = {
        version: 1,
        savedAt: lastSyncTimestampRef.current,
        points: newMapPoints,
        tickerSummaries: newTickers,
      };
      setCachedSnapshot(snapshot);
      try {
        localStorage.setItem(snapshotKey, JSON.stringify(snapshot));
      } catch {
        // Live data remains usable when browser storage is unavailable.
      }

      if (isManual) {
        toast.success("Data telemetri BMKG & PVMBG berhasil diperbarui.");
      }
    } catch (error: unknown) {
      if (isMountedRef.current) {
        const message = error instanceof DOMException && error.name === "AbortError"
          ? "Koneksi terlalu lambat untuk menyelesaikan sinkronisasi."
          : error instanceof Error
            ? error.message
            : "Gagal sinkronisasi telemetri.";
        setSyncError(message);
        if (isManual) {
          toast.error("Gagal memperbarui data bencana terkini.");
        }
      }
    } finally {
      if (timeout) window.clearTimeout(timeout);
      if (isMountedRef.current) {
        setIsLiveSyncing(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    isMountedRef.current = true;
    queueMicrotask(() => {
      if (!isMountedRef.current) return;
      setCachedSnapshot(readSnapshot());
      setNetworkStatus(connectionStatus());
    });

    const updateConnection = () => setNetworkStatus(connectionStatus());
    const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    connection?.addEventListener("change", updateConnection);

    queueMicrotask(() => {
      if (isMountedRef.current) void fetchLiveAlerts(false);
    });

    // Visibility-aware polling
    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = (interval: number) => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        fetchLiveAlerts(false);
      }, interval);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // If tab became active and last sync was > 30s ago, trigger immediate sync
        const elapsed = Date.now() - lastSyncTimestampRef.current;
        if (elapsed > 30_000) {
          fetchLiveAlerts(false);
        }
        startPolling(pollIntervalMs);
      } else {
        // Slow down polling when tab is hidden (120s) to conserve client & network resources
        startPolling(120_000);
      }
    };

    startPolling(pollIntervalMs);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      connection?.removeEventListener("change", updateConnection);
    };
  }, [fetchLiveAlerts, pollIntervalMs]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const useLastSnapshot = useCallback(() => {
    if (!cachedSnapshot) return;
    setExternalPoints(cachedSnapshot.points);
    setTickerSummaries(cachedSnapshot.tickerSummaries);
    setLastSyncTime(new Date(cachedSnapshot.savedAt));
    setIsUsingCachedData(true);
    setSyncError(null);
  }, [cachedSnapshot]);

  const referenceTime = lastSyncTime?.getTime() ?? cachedSnapshot?.savedAt ?? null;
  const age = referenceTime ? now - referenceTime : 0;
  const dataAge: DataAge = age >= expiredAfterMs ? "expired" : age >= staleAfterMs ? "stale" : "fresh";

  return {
    externalPoints,
    tickerSummaries,
    isLiveSyncing,
    lastSyncTime,
    syncError,
    networkStatus,
    dataAge,
    hasCachedData: Boolean(cachedSnapshot),
    isUsingCachedData,
    useLastSnapshot,
    refreshNow: () => fetchLiveAlerts(true),
  };
}
