import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { SectionCardItem, SectionCardTone } from "@/lib/dashboard-metrics";
import { cn } from "@/lib/utils";

const iconTones: Record<SectionCardTone, string> = {
  brand: "bg-primary/10 text-primary",
  critical: "bg-status-critical/12 text-[var(--color-critical-deep)]",
  teal: "bg-secondary text-[var(--color-teal)]",
  warning: "bg-status-warning/16 text-[var(--color-ink)]",
  neutral: "bg-muted text-muted-foreground",
};

const railTones: Record<SectionCardTone, string> = {
  brand: "bg-primary",
  critical: "bg-status-critical",
  teal: "bg-[var(--color-teal)]",
  warning: "bg-status-warning",
  neutral: "bg-border",
};

export function SectionCards({ items }: { items: SectionCardItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 @md/main:grid-cols-2 @4xl/main:grid-cols-4">
      {items.map((item) => {
        const DeltaIcon = item.delta
          ? item.delta.direction === "up"
            ? TrendingUp
            : item.delta.direction === "down"
              ? TrendingDown
              : Minus
          : null;

        return (
          <Card key={item.id} className="operational-surface @container/card relative overflow-hidden py-0 shadow-none">
            <div className={cn("absolute inset-x-0 top-0 h-0.5 opacity-70", railTones[item.tone])} />
            <CardHeader className="gap-1.5 pt-5">
              <CardDescription className="flex items-center gap-2">
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", iconTones[item.tone])}>
                  <item.icon className="size-4" aria-hidden="true" />
                </span>
                {item.label}
              </CardDescription>
              <CardTitle className="data-number text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {item.value}
              </CardTitle>
              {item.delta && DeltaIcon ? (
                <CardAction>
                  <Badge variant="outline" className="gap-1 rounded-full">
                    <DeltaIcon className="size-3.5" aria-hidden="true" />
                    {item.delta.label}
                  </Badge>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 pb-5 text-sm">
              <p className="line-clamp-1 font-medium">{item.footerTitle}</p>
              <p className="text-xs leading-5 text-muted-foreground">{item.delta?.caption ?? item.footerNote}</p>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
