import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SupportCard() {
  return (
    <Card className="overflow-hidden shadow-none group-data-[collapsible=icon]:hidden bg-muted/40 dark:bg-muted/20 border border-border/70">
      <CardHeader className="min-w-0 px-3.5 py-3">
        <CardTitle className="truncate text-xs font-semibold text-foreground">Siaga Darurat KMIPN</CardTitle>
        <CardDescription className="line-clamp-2 text-[11px] mt-0.5 leading-snug text-muted-foreground">
          Pusat kendali tanggap darurat dan logistik terpadu BNPB & BPBD.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
