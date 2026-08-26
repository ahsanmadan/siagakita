import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationalCard } from "@/components/operational-ui";

export function AuditTrailPreview({
  items,
}: {
  items: Array<{ action: string; actor: string; time: string }>;
}) {
  return (
    <OperationalCard>
      <CardHeader className="flex flex-row items-center justify-between gap-3 py-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
          <CardTitle className="text-base">Jejak audit</CardTitle>
        </div>
        <Badge variant="outline">Database</Badge>
      </CardHeader>
      <CardContent className="space-y-3 pb-5">
        {items.map((item) => (
          <div key={`${item.action}-${item.time}`} className="rounded-xl border bg-background/70 p-3">
            <p className="text-sm font-medium">{item.action}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.actor} · {item.time}</p>
          </div>
        ))}
      </CardContent>
    </OperationalCard>
  );
}
