"use client";

import { type ReactNode } from "react";
import { SphereGridBackground } from "@/components/ui/background-components";
import { LegalModal } from "@/components/legal-modal";
import { cn } from "@/lib/utils";

export function AuthUI({
  children,
  className,
}: {
  children: ReactNode;
  image?: { src: string; alt: string };
  slides?: unknown[];
  className?: string;
}) {
  return (
    <main
      className={cn(
        "grid min-h-svh overflow-hidden bg-white text-foreground lg:grid-cols-[minmax(27.5rem,0.68fr)_minmax(0,1.32fr)]",
        className,
      )}
    >
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>

      {/* Sisi Kiri: Form Login Elevated */}
      <section className="relative z-20 flex min-h-svh items-center justify-center bg-background px-6 py-12 sm:px-10 border-r border-border shadow-[16px_0_40px_-12px_rgba(15,23,42,0.09)] dark:shadow-[16px_0_40px_-12px_rgba(0,0,0,0.45)]">
        {/* Logo SiagaKita di Pojok Kiri Atas Section */}
        <div className="absolute top-6 left-6 sm:top-8 sm:left-10 z-30 flex items-center gap-2">
          <img
            src="/brand/logo-siagakita.png"
            alt="Logo SiagaKita"
            className="h-7 w-auto object-contain"
          />
        </div>

        <SphereGridBackground />
        <div className="relative z-10 w-full flex justify-center">{children}</div>

        {/* Ketentuan Layanan & Kebijakan Privasi di Tengah Bawah Section */}
        <div className="absolute bottom-6 sm:bottom-8 inset-x-0 z-30 flex items-center justify-center text-center pointer-events-auto">
          <LegalModal />
        </div>
      </section>

      {/* Sisi Kanan: Putih Polos Bersih */}
      <section className="relative z-10 hidden min-h-svh bg-white lg:block select-none" />
    </main>
  );
}
