import { CircleCheck, TriangleAlert } from "lucide-react";
import type { ActionResult } from "@/lib/action-state";
import { cn } from "@/lib/utils";

export function FormStateMessage({
  state,
  className,
}: {
  state?: ActionResult;
  className?: string;
}) {
  if (!state?.message) return null;

  const Icon = state.ok ? CircleCheck : TriangleAlert;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm leading-5",
        state.ok
          ? "border-status-safe/20 bg-status-safe/10 text-[var(--color-teal-deep)]"
          : "border-status-critical/20 bg-status-critical/10 text-[var(--color-critical-deep)]",
        className,
      )}
      role={state.ok ? "status" : "alert"}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{state.message}</span>
    </div>
  );
}
