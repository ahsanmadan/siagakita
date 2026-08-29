import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

export function SphereGridBackground({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-0", className)}
      style={{
        background: "transparent",
        backgroundImage: `
          linear-gradient(to right, rgba(71,85,105,0.08) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(71,85,105,0.08) 1px, transparent 1px),
          radial-gradient(circle at 50% 50%, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.04) 40%, transparent 80%)
        `,
        backgroundSize: "32px 32px, 32px 32px, 100% 100%",
      }}
      {...props}
    />
  );
}

export function SoftYellowGlowBackground({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-0 opacity-60 mix-blend-multiply", className)}
      style={{
        backgroundImage: `radial-gradient(circle at center, #FFF991 0%, transparent 70%)`,
      }}
      {...props}
    />
  );
}
