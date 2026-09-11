"use client";

import { CheckCircle2, CircleAlert, Info, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PublicMapStatusTone = "critical" | "warning" | "info" | "success";

const icons = {
  critical: CircleAlert,
  warning: TriangleAlert,
  info: Info,
  success: CheckCircle2,
};

export function PublicMapStatus({
  tone,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  loading = false,
  compact = false,
  className,
}: {
  tone: PublicMapStatusTone;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  loading?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const Icon = loading ? Loader2 : icons[tone];

  return (
    <div
      className={cn("public-map-status", compact && "is-compact", className)}
      data-tone={tone}
      role={tone === "critical" ? "alert" : "status"}
      aria-live={tone === "critical" ? "assertive" : "polite"}
    >
      <Icon className={cn("public-map-status-icon", loading && "animate-spin")} aria-hidden="true" />
      <div className="public-map-status-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {actionLabel && onAction ? (
        <div className="public-map-status-actions">
          <Button type="button" variant="outline" size="sm" onClick={onAction} disabled={loading}>
            {actionLabel}
          </Button>
          {secondaryActionLabel && onSecondaryAction ? (
            <Button type="button" variant="ghost" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
