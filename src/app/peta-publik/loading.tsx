import Link from "next/link";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
} from "@radix-ui/react-icons";
import { Radio, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublicMapLoading() {
  return (
    <main
      className="public-map-shell relative min-h-svh overflow-hidden bg-background select-none"
      data-panel-open="true"
      data-detail-open="false"
      data-mobile-view="list"
      data-mobile-snap="peek"
    >
      {/* ── 1. Tactical Cartographic Map Surface & Telemetry Grid ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="map-loading-surface" />
        <div className="map-loading-grid text-foreground" />

        {/* Ambient Topographical Vector Contours */}
        <svg
          className="absolute inset-0 h-full w-full opacity-15 dark:opacity-20 stroke-primary/40 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern id="coord-grid" width="120" height="120" patternUnits="userSpaceOnUse">
              <path d="M 120 0 L 0 0 0 120" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.12" />
              <circle cx="0" cy="0" r="1.5" fill="currentColor" fillOpacity="0.25" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#coord-grid)" />

          {/* Topographic Isobars */}
          <path
            d="M -100 250 C 200 180, 500 320, 900 240 C 1300 160, 1600 280, 2000 200"
            fill="none"
            strokeWidth="1.2"
            strokeDasharray="4 6"
          />
          <path
            d="M -50 450 C 300 380, 650 520, 1100 420 C 1500 320, 1750 480, 2100 390"
            fill="none"
            strokeWidth="1"
            strokeOpacity="0.7"
          />
          <path
            d="M 100 650 C 450 560, 800 700, 1250 600 C 1650 500, 1900 640, 2200 580"
            fill="none"
            strokeWidth="1"
            strokeOpacity="0.5"
          />
        </svg>

        {/* Geographical Coordinate Marks */}
        <div className="absolute top-20 right-28 hidden font-mono text-[10px] text-muted-foreground/60 tracking-wider md:block">
          LAT -06° 12&apos; 00&quot; S · LON 106° 49&apos; 00&quot; E
        </div>
        <div className="absolute bottom-16 right-36 hidden font-mono text-[9px] text-muted-foreground/50 tracking-widest lg:block">
          SECTOR 04 / INDONESIA DISASTER OBSERVATORY
        </div>

        {/* Tactical Telemetry Pings across Key Indonesian Crisis Monitoring Points */}
        {/* Node 1: Jawa Barat / Cianjur */}
        <div className="absolute top-[58%] left-[45%] lg:left-[56%] flex items-center justify-center">
          <span className="absolute size-9 rounded-full bg-red-500/20 animate-ping" />
          <span className="size-2 rounded-full bg-red-500 ring-4 ring-red-500/30" />
          <span className="absolute -top-5 left-3 font-mono text-[9.5px] font-semibold text-foreground/70 bg-card/80 px-1 rounded border border-border/40 backdrop-blur-xs whitespace-nowrap">
            CJR-01 · Siaga
          </span>
        </div>

        {/* Node 2: Jawa Timur / Semeru */}
        <div className="absolute top-[64%] left-[62%] lg:left-[68%] hidden sm:flex items-center justify-center">
          <span className="absolute size-8 rounded-full bg-amber-500/20 animate-ping [animation-delay:400ms]" />
          <span className="size-2 rounded-full bg-amber-500 ring-4 ring-amber-500/30" />
          <span className="absolute -top-5 left-3 font-mono text-[9.5px] font-semibold text-foreground/70 bg-card/80 px-1 rounded border border-border/40 backdrop-blur-xs whitespace-nowrap">
            SMR-IV · Awas
          </span>
        </div>

        {/* Node 3: Sumatera Barat / Marapi */}
        <div className="absolute top-[42%] left-[28%] lg:left-[42%] hidden md:flex items-center justify-center">
          <span className="absolute size-7 rounded-full bg-sky-500/20 animate-ping [animation-delay:800ms]" />
          <span className="size-2 rounded-full bg-sky-500 ring-4 ring-sky-500/30" />
          <span className="absolute -top-5 left-3 font-mono text-[9.5px] font-semibold text-foreground/70 bg-card/80 px-1 rounded border border-border/40 backdrop-blur-xs whitespace-nowrap">
            MRP-II · Waspada
          </span>
        </div>

        {/* Radial Vignette */}
        <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/5 dark:to-black/35" />
      </div>

      {/* ── 2. Sleek Floating Telemetry Status Banner (Non-intrusive Pill) ── */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center px-4 lg:pl-[380px] xl:pl-[420px]">
        <div className="flex items-center gap-3 rounded-full border border-border/80 bg-card/92 px-4 py-2 shadow-lg backdrop-blur-md transition-all">
          <span className="relative flex size-2.5 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-500 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-sky-500 shadow-xs" />
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span
              className="font-bold text-foreground tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Sinkronisasi Peta Situasi
            </span>
            <span className="text-muted-foreground/40 hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <span className="text-[11.5px] text-muted-foreground font-medium hidden sm:inline">
              Mengunduh data spasial &amp; telemetri sensor darurat
            </span>
          </div>
          <div className="ml-1 h-3.5 w-16 overflow-hidden rounded-full bg-muted/90 hidden md:block">
            <div className="map-loading-bar h-full w-8 rounded-full bg-primary/80" />
          </div>
        </div>
      </div>

      {/* ── 3. Floating Map Controls (Bottom-Left) ── */}
      <div className="public-map-layer-control pointer-events-none">
        <button
          type="button"
          disabled
          className="public-map-control-button group relative grid size-11 place-items-center rounded-xl border border-border bg-card text-foreground shadow-sm opacity-90 cursor-default"
          aria-label="Atur layer peta"
        >
          <svg
            className="size-5 text-foreground/80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="12 2 2 7 12 12 22 7 12 2" fill="currentColor" fillOpacity="0.08" />
            <polyline points="2 12 12 17 22 12" />
            <polyline points="2 17 12 22 22 17" />
          </svg>
        </button>
      </div>

      {/* ── 4. Map Attribution (Bottom-Left Desktop) ── */}
      <div className="maplibregl-ctrl-bottom-left pointer-events-none absolute z-30 hidden lg:block">
        <div className="maplibregl-ctrl-attrib flex items-center justify-center size-11 rounded-xl border border-border bg-card shadow-sm text-foreground/80">
          <svg className="size-5 text-foreground/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
      </div>

      {/* ── 5. Map Navigation Controls (Bottom-Right) ── */}
      <div className="maplibregl-ctrl-bottom-right pointer-events-none absolute z-30 hidden sm:flex">
        <div className="maplibregl-ctrl-group overflow-hidden rounded-xl border border-border bg-card shadow-md flex flex-col">
          <button
            type="button"
            disabled
            className="flex size-10 items-center justify-center border-b border-border/80 text-foreground/80 cursor-default"
            aria-label="Perbesar peta"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            disabled
            className="flex size-10 items-center justify-center border-b border-border/80 text-foreground/80 cursor-default"
            aria-label="Perkecil peta"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            disabled
            className="flex size-10 items-center justify-center border-b border-border/80 text-foreground/80 cursor-default"
            aria-label="Arah kompas"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </button>
          <button
            type="button"
            disabled
            className="flex size-10 items-center justify-center text-foreground/80 cursor-default"
            aria-label="Layar penuh"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── 6. Top-Right Emergency Actions ── */}
      <div className="public-map-staff-login-wrap pointer-events-none absolute right-3 top-3 z-50 flex items-center gap-2 sm:right-5">
        <div className="pointer-events-auto">
          <Button
            asChild
            variant="destructive"
            size="sm"
            className="h-9 gap-1.5 rounded-full px-3.5 text-xs font-semibold shadow-xs cursor-default"
          >
            <span>
              <ShieldAlert className="size-3.5" />
              <span>Lapor Darurat</span>
            </span>
          </Button>
        </div>

        <div className="max-lg:hidden pointer-events-auto">
          <Button
            asChild
            variant="outline"
            className="public-map-staff-login h-9 rounded-md px-3.5 text-[12px] font-medium shadow-none hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Link href="/login" aria-label="Portal masuk petugas operasional">
              Portal Petugas
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 7. Desktop Sidebar Toggle Button ── */}
      <button
        type="button"
        disabled
        className="public-map-sidebar-toggle hidden lg:grid pointer-events-none cursor-default"
        aria-label="Panel informasi bencana"
      >
        <ChevronLeftIcon className="size-4 text-foreground/70" />
      </button>

      {/* ── 8. Mobile Header Skeleton Controls ── */}
      <div className="public-map-mobile-controls pointer-events-none lg:hidden">
        <div className="public-map-mobile-search pointer-events-auto">
          <div className="disaster-search p-0 overflow-hidden">
            <div className="flex h-full w-full items-center gap-2 px-3 text-muted-foreground">
              <MagnifyingGlassIcon className="size-4 shrink-0" />
              <span className="text-xs text-muted-foreground/75 select-none">Cari posko atau wilayah</span>
            </div>
          </div>
        </div>
        <div className="public-map-mobile-filter pointer-events-auto">
          <div className="h-9 w-full rounded-md border border-border/70 bg-card px-3 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-2 font-medium text-foreground/80">
              <MixerHorizontalIcon className="size-3.5 text-muted-foreground" />
              Semua Titik
            </span>
            <ChevronDownIcon className="size-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* ── 9. Professional Sidebar Skeleton Architecture ── */}
      <section
        className="public-map-results-panel pointer-events-none absolute z-40"
        data-open="true"
        data-snap="peek"
        aria-label="Memuat panel informasi bencana dan posko"
      >
        {/* Mobile Drag Handle */}
        <div className="public-map-sheet-handle lg:hidden pointer-events-auto">
          <span className="public-map-sheet-pill" />
        </div>

        {/* Mobile Preview Sheet Item */}
        <div className="lg:hidden flex flex-col flex-1 min-h-0 bg-card/98 border-t border-border p-3">
          <div className="disaster-list-item pointer-events-none">
            <div className="disaster-list-card has-media flex items-center w-full">
              <div className="disaster-list-media skeleton-shimmer shrink-0" />
              <div className="disaster-list-content flex-1 min-w-0 pr-3 py-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-4 w-32 rounded-md bg-muted/80 skeleton-shimmer" />
                  <div className="h-5 w-16 rounded-full bg-muted/70 skeleton-shimmer" />
                </div>
                <div className="h-3 w-40 rounded bg-muted/60 skeleton-shimmer" />
                <div className="h-2.5 w-24 rounded bg-muted/50 skeleton-shimmer" />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Sidebar Structure (1:1 with DisasterSidebar) */}
        <div className="hidden lg:flex flex-col flex-1 min-h-0">
          <div className="disaster-sidebar-card pointer-events-auto flex h-full flex-col overflow-hidden border bg-card/98 shadow-md lg:h-full lg:rounded-none lg:border-y-0 lg:border-l-0 lg:border-r">
            {/* Header: Logo, Title, Divider */}
            <div className="disaster-sidebar-top">
              <div className="disaster-brand-row flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Link
                    href="/"
                    className="flex items-center shrink-0 transition-opacity hover:opacity-85 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
                    title="Beranda SiagaKita"
                  >
                    <img
                      src="/brand/logo-siagakita.png"
                      alt="Logo SiagaKita"
                      className="h-7 w-auto max-w-[110px] object-contain shrink-0 dark:invert dark:brightness-125"
                    />
                  </Link>
                  <div className="h-4.5 w-px bg-border/80 shrink-0 max-sm:hidden" aria-hidden="true" />
                  <div className="disaster-brand-heading min-w-0 max-sm:hidden">
                    <h1 className="disaster-brand-title text-foreground font-semibold">Peta Publik</h1>
                    <p className="disaster-brand-subtitle text-muted-foreground">Pantauan darurat &amp; posko</p>
                  </div>
                </div>
              </div>

              {/* Exact Search & Morphing Filter Skeletons */}
              <div className="disaster-sidebar-controls max-lg:hidden">
                <div className="disaster-search p-0 overflow-hidden">
                  <div className="flex h-full w-full items-center gap-2 px-3 text-muted-foreground">
                    <MagnifyingGlassIcon className="size-4 shrink-0" />
                    <span className="text-xs text-muted-foreground/70 select-none">Cari posko atau wilayah</span>
                  </div>
                </div>
                <div className="h-9 w-full rounded-md border border-border bg-card px-3 flex items-center justify-between text-xs text-muted-foreground cursor-default">
                  <span className="flex items-center gap-2 font-medium text-foreground/80">
                    <MixerHorizontalIcon className="size-3.5 text-muted-foreground" />
                    Semua Titik
                  </span>
                  <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* List Items Skeleton (Realistic Card Skeletons) */}
            <div className="mobile-sheet-scroll min-h-0 flex-1 overflow-hidden">
              <div className="disaster-list space-y-3 p-3">
                {/* 1. Operational Card Skeleton 1 */}
                <div className="disaster-list-item pointer-events-none">
                  <div className="disaster-list-card has-media flex items-center w-full border border-border/60 rounded-xl p-2">
                    <div className="disaster-list-media skeleton-shimmer shrink-0 rounded-lg" />
                    <div className="disaster-list-content flex-1 min-w-0 px-2.5 py-1.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="h-4 w-36 rounded-md bg-muted/80 skeleton-shimmer" />
                        <div className="h-5 w-16 rounded-full bg-muted/65 skeleton-shimmer" />
                      </div>
                      <div className="h-3 w-48 rounded bg-muted/55 skeleton-shimmer" />
                      <div className="flex items-center gap-2 pt-0.5">
                        <div className="h-2.5 w-20 rounded bg-muted/45 skeleton-shimmer" />
                        <span className="size-1 rounded-full bg-muted-foreground/30" />
                        <div className="h-2.5 w-16 rounded bg-muted/40 skeleton-shimmer" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Operational Card Skeleton 2 */}
                <div className="disaster-list-item pointer-events-none">
                  <div className="disaster-list-card has-media flex items-center w-full border border-border/60 rounded-xl p-2">
                    <div className="disaster-list-media skeleton-shimmer shrink-0 rounded-lg" />
                    <div className="disaster-list-content flex-1 min-w-0 px-2.5 py-1.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="h-4 w-32 rounded-md bg-muted/80 skeleton-shimmer" />
                        <div className="h-5 w-16 rounded-full bg-muted/65 skeleton-shimmer" />
                      </div>
                      <div className="h-3 w-44 rounded bg-muted/55 skeleton-shimmer" />
                      <div className="flex items-center gap-2 pt-0.5">
                        <div className="h-2.5 w-20 rounded bg-muted/45 skeleton-shimmer" />
                        <span className="size-1 rounded-full bg-muted-foreground/30" />
                        <div className="h-2.5 w-16 rounded bg-muted/40 skeleton-shimmer" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Volcano Accordion Skeleton */}
                <div className="disaster-accordion-group border-t border-border/60 pt-3" data-open="true">
                  <div className="disaster-accordion-trigger pointer-events-none cursor-default px-1">
                    <div className="disaster-accordion-left min-w-0 flex-1">
                      <span className="disaster-accordion-title">Aktivitas Gunung Api</span>
                      <span className="disaster-accordion-subtitle">PVMBG</span>
                    </div>
                    <div className="disaster-accordion-right shrink-0 flex items-center gap-2">
                      <div className="h-5 w-18 rounded-full bg-muted/70 skeleton-shimmer" />
                      <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-1.5">
                    <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="h-3.5 w-28 rounded bg-muted/80 skeleton-shimmer" />
                        <div className="h-4 w-12 rounded-full bg-muted/60 skeleton-shimmer" />
                      </div>
                      <div className="h-2.5 w-36 rounded bg-muted/50 skeleton-shimmer" />
                    </div>
                  </div>
                </div>

                {/* 4. Earthquake Accordion Skeleton */}
                <div className="disaster-accordion-group border-t border-border/60 pt-3" data-open="true">
                  <div className="disaster-accordion-trigger pointer-events-none cursor-default px-1">
                    <div className="disaster-accordion-left min-w-0 flex-1">
                      <span className="disaster-accordion-title">Pemantauan Gempa Bumi</span>
                      <span className="disaster-accordion-subtitle">BMKG</span>
                    </div>
                    <div className="disaster-accordion-right shrink-0 flex items-center gap-2">
                      <div className="h-5 w-16 rounded-full bg-muted/70 skeleton-shimmer" />
                      <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-1.5">
                    <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="h-3.5 w-24 rounded bg-muted/80 skeleton-shimmer" />
                        <div className="h-4 w-14 rounded-full bg-muted/60 skeleton-shimmer" />
                      </div>
                      <div className="h-2.5 w-40 rounded bg-muted/50 skeleton-shimmer" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer: Authentic Data Sources Bar */}
            <div className="flex items-center justify-between border-t border-border/60 px-3.5 py-2 bg-muted/20 text-[11px] text-muted-foreground">
              <span className="truncate">
                Sumber: BMKG, PVMBG, Data Lapangan
              </span>
              <span className="text-[10px] text-muted-foreground/80 shrink-0 ml-2 font-mono flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Feed
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
