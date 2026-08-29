import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CrisisStatus } from "@/lib/types";

const labels: Record<CrisisStatus, string> = {
  critical: "Bahaya Tinggi",
  major: "Terdampak Berat",
  warning: "Perlu Waspada",
  safe: "Relatif Aman",
};

const styles: Record<CrisisStatus, string> = {
  critical: "border-status-critical/30 bg-status-critical/12 text-[var(--color-critical-deep)]",
  major: "border-status-major/35 bg-status-major/14 text-[var(--color-ink)]",
  warning: "border-status-warning/40 bg-status-warning/16 text-[var(--color-ink)]",
  safe: "border-status-safe/35 bg-status-safe/14 text-[var(--color-ink)]",
};

export function StatusBadge({ status, className }: { status: CrisisStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 font-medium", styles[status], className)}>
      {labels[status]}
    </Badge>
  );
}
