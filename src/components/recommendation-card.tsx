import { CheckCircle2, DatabaseZap, ShieldAlert, Sparkles } from "lucide-react";
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

function priorityText(title: string) {
  const text = title.replace(/^prioritaskan\s+/i, "").replace(/^prioritas\s+/i, "");
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : title;
}

function reasonItems(factors: string[]) {
  const normalized = factors.map((factor) => factor.toLowerCase());
  const reasons = [
    normalized.some((factor) => factor.includes("pengungsi") || factor.includes("populasi")) ? "Jumlah pengungsi tinggi" : null,
    normalized.some((factor) => factor.includes("rentan") || factor.includes("lansia") || factor.includes("anak")) ? "Kelompok rentan terdampak" : null,
    normalized.some((factor) => factor.includes("stok") || factor.includes("gudang")) ? "Stok terbatas" : null,
    normalized.some((factor) => factor.includes("kebutuhan") || factor.includes("kurang") || factor.includes("belum")) ? "Kebutuhan belum terpenuhi" : null,
  ].filter(Boolean) as string[];

  return reasons.length ? reasons : factors.slice(0, 4);
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
        <CardTitle className="text-lg leading-7">Prioritas: {priorityText(recommendation.title)}</CardTitle>
        <CardDescription className="leading-6">{recommendation.rationale}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        <div className="rounded-xl border bg-background/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Alasan</p>
          <div className="mt-3 grid gap-2">
            {reasonItems(recommendation.factors).map((reason) => (
              <p key={reason} className="flex items-start gap-2 text-sm leading-5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-teal)]" />
                {reason}
              </p>
            ))}
          </div>
        </div>
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
        <p className="text-[11px] leading-5 text-muted-foreground">Rekomendasi membantu keputusan petugas dan tidak menggantikan keputusan BPBD.</p>
      </CardContent>
    </OperationalCard>
  );
}
