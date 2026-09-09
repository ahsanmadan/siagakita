"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { MapPoint } from "@/components/crisis-map";

export interface LiveAlertsPayload {
  timestamp: string;
  sources: string[];
  earthquakes: {
    autoGempa: any | null;
    recentCount: number;
    latest: any | null;
  };
  volcanoes: {
    totalMonitored: number;
    criticalCount: number;
    list: any[];
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

  const seenIdsRef = useRef<Set<string>>(new Set(initialPoints.map((p) => p.id)));
  const isMountedRef = useRef(true);
  const lastSyncTimestampRef = useRef<number>(0);

  const fetchLiveAlerts = useCallback(async (isManual = false) => {
    if (!enabled) return;

    try {
      setIsLiveSyncing(true);
      const res = await fetch("/api/alerts/live", {
        headers: { "Accept": "application/json" },
        cache: "no-store",
      });

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
      lastSyncTimestampRef.current = Date.now();

      if (isManual) {
        toast.success("Data telemetri BMKG & PVMBG berhasil diperbarui.");
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setSyncError(err?.message || "Gagal sinkronisasi telemetri.");
        if (isManual) {
          toast.error("Gagal memperbarui data bencana terkini.");
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLiveSyncing(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    isMountedRef.current = true;

    // Fetch immediately on mount
    fetchLiveAlerts(false);

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
    };
  }, [fetchLiveAlerts, pollIntervalMs]);

  return {
    externalPoints,
    tickerSummaries,
    isLiveSyncing,
    lastSyncTime,
    syncError,
    refreshNow: () => fetchLiveAlerts(true),
  };
}
