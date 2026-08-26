import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("overflow-clip", compact ? "h-9 w-32" : "h-12 w-44", className)}>
      <Image
        src="/brand/logo-siagakita.png"
        alt="SiagaKita"
        width={1386}
        height={336}
        priority
        className="h-full w-full object-contain"
      />
    </div>
  );
}
