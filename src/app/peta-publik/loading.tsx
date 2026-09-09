export default function PublicMapLoading() {
  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-background select-none">
      {/* 1. Map Canvas Loading Background */}
      <div className="absolute inset-0 bg-[#eef2f6] dark:bg-[#111827] flex items-center justify-center">
        {/* Subtle cartographic grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />

        {/* Center Radar / Compass Loading Indicator */}
        <div className="relative z-10 flex flex-col items-center gap-3 text-muted-foreground/70">
          <div className="relative flex size-14 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/20 opacity-75" />
            <div className="relative flex size-10 items-center justify-center rounded-full border border-border/80 bg-card/80 backdrop-blur-md shadow-xs">
              <svg
                className="size-5 animate-spin text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          </div>
          <span className="text-xs font-medium tracking-wide text-muted-foreground animate-pulse">
            Memuat peta situasi darurat...
          </span>
        </div>
      </div>

      {/* 2. Top Emergency Marquee Skeleton */}
      <aside className="pointer-events-none absolute top-3 inset-x-3 z-30 flex justify-center lg:left-[450px] xl:left-[490px] lg:right-32">
        <div className="flex items-center gap-2 max-w-xl w-full h-8.5 px-3 rounded-full bg-card/85 dark:bg-card/90 backdrop-blur-md border border-border shadow-xs">
          <div className="h-3 w-18 rounded-md bg-red-500/20 animate-pulse shrink-0" />
          <div className="h-2.5 w-48 rounded bg-muted animate-pulse" />
        </div>
      </aside>

      {/* 3. Top-Right Login / Profile Action Skeleton */}
      <div className="absolute right-3.5 top-3.5 z-30 hidden sm:flex items-center gap-2">
        <div className="h-8.5 w-24 rounded-full bg-card/85 dark:bg-card/90 backdrop-blur-md border border-border shadow-xs animate-pulse" />
      </div>

      {/* 4. Desktop Sidebar Skeleton */}
      <aside className="absolute inset-y-0 left-0 z-20 hidden lg:flex w-[380px] xl:w-[420px] flex-col border-r border-border bg-card/95 backdrop-blur-md shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 p-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-28 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="size-8 rounded-lg bg-muted/60 animate-pulse" />
        </div>

        {/* Search & Filters */}
        <div className="space-y-3 p-4 border-b border-border/60">
          <div className="h-9 w-full rounded-xl bg-muted/70 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-7 w-16 rounded-lg bg-muted/70 animate-pulse" />
            <div className="h-7 w-20 rounded-lg bg-muted/50 animate-pulse" />
            <div className="h-7 w-20 rounded-lg bg-muted/50 animate-pulse" />
          </div>
        </div>

        {/* List Items Skeleton */}
        <div className="flex-1 overflow-hidden p-3 space-y-2.5">
          {[1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className="flex gap-3 rounded-xl border border-border/60 bg-muted/20 p-3"
            >
              <div className="size-14 rounded-lg bg-muted/60 shrink-0 animate-pulse" />
              <div className="flex-1 space-y-2 py-0.5">
                <div className="flex justify-between items-center gap-2">
                  <div className="h-4 w-32 rounded bg-muted/80 animate-pulse" />
                  <div className="h-3.5 w-14 rounded bg-muted/60 animate-pulse" />
                </div>
                <div className="h-3 w-40 rounded bg-muted/50 animate-pulse" />
                <div className="h-2.5 w-24 rounded bg-muted/40 animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Legend Skeleton */}
        <div className="border-t border-border/80 p-3.5 bg-card/80">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-muted animate-pulse" />
                <div className="h-2.5 w-10 rounded bg-muted/70 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* 5. Mobile Bottom Sheet Skeleton */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex lg:hidden flex-col rounded-t-2xl border-t border-border bg-card/95 p-4 shadow-xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
        <div className="flex gap-3">
          <div className="size-12 rounded-lg bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-3 w-44 rounded bg-muted/70 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
