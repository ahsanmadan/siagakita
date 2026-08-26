import { DatabaseZap, ShieldAlert, Sparkles } from "lucide-react";
import { MutationAction } from "@/components/mutation-action";
import { OperationalCard } from "@/components/operational-ui";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { reviewRecommendationAction } from "@/lib/actions/operations";
import type { AIRecommendation } from "@/lib/types";

function confidenceLabel(confidence: number) {
  if (confidence >= 80) return "Tinggi";
  if (confidence >= 50) return "Sedang";
  return "Rendah";
}

export function RecommendationCard({
  recommendation,
  title = "Saran prioritas",
  className,
}: {
  recommendation: AIRecommendation;
  title?: string;
  className?: string;
}) {
  return (
    <OperationalCard emphasis="critical" className={className}>
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <Sparkles className="size-4" />
          {title}
        </div>
        <CardTitle className="text-lg leading-7">{recommendation.title}</CardTitle>
        <CardDescription className="leading-6">{recommendation.rationale}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        <div className="flex flex-wrap gap-2">{recommendation.factors.map((factor) => <Badge key={factor} variant="secondary">{factor}</Badge>)}</div>
        <div className="rounded-xl border bg-background/70 p-3">
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldAlert className="size-3.5" /> Tingkat prioritas saran</p>
          <p className="mt-1 text-sm font-semibold">{confidenceLabel(recommendation.confidence)} · {recommendation.confidence}%</p>
        </div>
        <div className="rounded-xl border border-dashed bg-muted/45 p-3 text-xs leading-5 text-muted-foreground">
          <p className="flex items-center gap-2 font-medium text-foreground"><DatabaseZap className="size-3.5" /> Dasar perhitungan</p>
          <p className="mt-1">Dihitung dari data posko, stok, kebutuhan, kelompok rentan, dan akses lokasi. Saran tidak menjalankan aksi otomatis.</p>
        </div>
        <MutationAction action={reviewRecommendationAction} label="Tandai ditinjau" fields={{ id: recommendation.id }} />
        <p className="text-[11px] leading-5 text-muted-foreground">Keputusan akhir tetap berada pada petugas berwenang.</p>
      </CardContent>
    </OperationalCard>
  );
}
