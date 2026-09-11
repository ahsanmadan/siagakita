"use client";

import { useEffect } from "react";
import { PublicMapStatus } from "@/components/public-map-status";

export default function PublicMapError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Public map route failed", error);
  }, [error]);

  return (
    <main className="grid min-h-svh place-items-center bg-muted/40 p-4">
      <PublicMapStatus
        className="w-full max-w-lg"
        tone="critical"
        title="Peta Publik belum dapat dibuka"
        description="Server gagal menyiapkan data pemantauan. Tidak ada data pribadi yang terpengaruh; coba muat ulang halaman."
        actionLabel="Muat ulang"
        onAction={retry}
      />
    </main>
  );
}
