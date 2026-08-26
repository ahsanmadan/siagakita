"use client";

import { type ReactNode } from "react";
import Image from "next/image";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";

export function AuthUI({
  children,
  image,
  className,
}: {
  children: ReactNode;
  image: { src: string; alt: string };
  className?: string;
}) {
  return (
    <main
      className={cn(
        "grid min-h-svh overflow-hidden bg-[#050607] text-white lg:grid-cols-[minmax(32rem,0.76fr)_minmax(0,1.24fr)]",
        className,
      )}
    >
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>

      <section className="relative flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_18%_12%,rgb(217_238_232/0.78),transparent_32rem),linear-gradient(180deg,#fbfdfc_0%,#edf7f4_100%)] px-6 py-12 text-[#0e2b3c] sm:px-10 lg:px-12 xl:px-16">
        <DotPattern
          width={32}
          height={32}
          cr={1}
          className="fill-[#0e2b3c]/[0.13] [mask-image:linear-gradient(115deg,white_0%,white_58%,transparent_92%)]"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/72 to-transparent" />
        <div className="pointer-events-none absolute -left-28 top-6 size-80 rounded-full bg-[#d7eee8]/58 blur-3xl" />
        <div className="relative z-10 w-full">{children}</div>
      </section>

      <section className="relative hidden min-h-svh overflow-clip bg-[#061116] lg:block">
        <Image src={image.src} alt={image.alt} fill priority className="object-cover object-center" sizes="60vw" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/72 via-[color-mix(in_oklch,var(--color-brand)_32%,transparent)] to-black/82" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgb(255_255_255/0.20)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.20)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/72 via-black/20 to-transparent" />
      </section>
    </main>
  );
}
