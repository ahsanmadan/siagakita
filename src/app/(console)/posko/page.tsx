import { Baby, HeartPulse, PersonStanding, Plus, Sparkles, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { FilterBar, OperationalCard } from "@/components/operational-ui";
import { PageHeader } from "@/components/page-header";
import { OperationalBrief } from "@/components/operational-brief";
import { RecommendationCard } from "@/components/recommendation-card";
import { ShelterQuickForms } from "@/components/shelter-quick-forms";
import { SubmitButton } from "@/components/submit-button";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createNeedRequest, createShelterAction, updateShelterPopulation } from "@/lib/actions/operations";
import { pickShelterRecommendation } from "@/lib/recommendation-context";
import { getOperationsData } from "@/lib/repositories/operations";

export default async function ShelterPage() {
  const { recommendations, shelters } = await getOperationsData();
  const totals = shelters.reduce((result, shelter) => ({ total: result.total + shelter.population.total, children: result.children + shelter.population.children, elderly: result.elderly + shelter.population.elderly, vulnerable: result.vulnerable + shelter.population.pregnant + shelter.population.disability }), { total: 0, children: 0, elderly: 0, vulnerable: 0 });
  const populationMetrics: Array<{ label: string; value: number; icon: LucideIcon; style: string }> = [
    { label: "Total pengungsi", value: totals.total, icon: Users, style: "bg-primary/10 text-primary" },
    { label: "Anak-anak", value: totals.children, icon: Baby, style: "bg-status-warning/15 text-[var(--color-ink)]" },
    { label: "Lansia", value: totals.elderly, icon: PersonStanding, style: "bg-secondary text-[var(--color-teal)]" },
    { label: "Rentan lainnya", value: totals.vulnerable, icon: HeartPulse, style: "bg-status-critical/12 text-[var(--color-critical-deep)]" },
  ];
  const needs = shelters.flatMap((shelter) => shelter.needs.map((need) => ({ ...need, shelter: shelter.name })));
  const criticalShelters = shelters.filter((shelter) => shelter.status === "critical").length;
  const criticalNeeds = needs.filter((need) => need.urgency === "critical").length;
  const overCapacityShelters = shelters.filter((shelter) => shelter.population.total > shelter.capacity).length;
  const shelterRecommendation = pickShelterRecommendation(recommendations, shelters);
  return (
    <div className="space-y-6">
      <PageHeader title="Posko, Pengungsi & Kebutuhan" description="Data dasar untuk menentukan kebutuhan harian, prioritas kelompok rentan, dan alokasi bantuan." actions={<Dialog><DialogTrigger asChild><Button className="min-h-11"><Plus /> Daftarkan posko</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Daftarkan posko baru</DialogTitle><DialogDescription>Catat lokasi dan kapasitas awal posko untuk masuk alur kebutuhan.</DialogDescription></DialogHeader><ActionForm action={createShelterAction} className="py-2"><div className="grid gap-2"><Label htmlFor="shelter-name">Nama posko</Label><Input id="shelter-name" name="name" placeholder="Contoh: Posko Balai Nagari" required /></div><div className="grid gap-2"><Label htmlFor="shelter-capacity">Kapasitas</Label><Input id="shelter-capacity" name="capacity" type="number" placeholder="0" min={1} required /></div><SubmitButton>Simpan posko</SubmitButton></ActionForm></DialogContent></Dialog>} />

      <OperationalBrief
        items={[
          { label: "Posko kritis", value: `${criticalShelters} perlu prioritas`, detail: "Fokus pembaruan populasi dan kebutuhan hari ini.", tone: criticalShelters ? "critical" : "teal", icon: Users },
          { label: "Kelebihan kapasitas", value: `${overCapacityShelters} posko`, detail: "Perlu relokasi atau dukungan posko tambahan.", tone: overCapacityShelters ? "warning" : "teal", icon: HeartPulse },
          { label: "Kebutuhan kritis", value: `${criticalNeeds} item`, detail: "Kesenjangan stok yang harus masuk alur logistik.", tone: criticalNeeds ? "critical" : "neutral", icon: Sparkles },
          { label: "Kelompok rentan", value: `${totals.children + totals.elderly + totals.vulnerable} orang`, detail: "Dasar penentuan prioritas bantuan posko.", tone: "warning", icon: Baby },
        ]}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{populationMetrics.map(({ label, value, icon: Icon, style }) => <Card key={label} className="operational-surface py-0 shadow-none"><CardContent className="flex items-center gap-4 p-4 sm:p-5"><div className={`grid size-11 place-items-center rounded-xl ${style}`}><Icon className="size-5" /></div><div><p className="text-xs text-muted-foreground">{label}</p><p className="data-number text-2xl font-semibold">{value.toLocaleString("id-ID")}</p></div></CardContent></Card>)}</section>

      {shelters[0] ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <ShelterQuickForms shelters={shelters} updateShelterPopulation={updateShelterPopulation} createNeedRequest={createNeedRequest} />
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.65fr)]">
        <OperationalCard className="overflow-clip"><CardHeader className="gap-4 py-5"><div><CardTitle className="text-base">Daftar posko aktif</CardTitle><CardDescription>Pilih posko untuk melihat kelompok rentan dan kebutuhan</CardDescription></div><FilterBar><span className="mr-auto text-xs font-medium text-muted-foreground">Kondisi posko</span><Select defaultValue="all"><SelectTrigger className="w-full bg-background sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua status</SelectItem><SelectItem value="critical">Kritis</SelectItem><SelectItem value="major">Mayor</SelectItem></SelectContent></Select></FilterBar></CardHeader><CardContent className="p-0"><div className="grid gap-3 p-4 md:hidden">{shelters.map((shelter) => <article key={shelter.id} className="rounded-xl border bg-background/72 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{shelter.name}</p><p className="mt-1 text-xs text-muted-foreground">{shelter.location}</p></div><StatusBadge status={shelter.status} /></div><div className="mt-4 flex justify-between text-xs"><span>{shelter.population.total} pengungsi</span><span>{Math.round((shelter.population.total / shelter.capacity) * 100)}% kapasitas</span></div><Progress value={(shelter.population.total / shelter.capacity) * 100} className="mt-2" /></article>)}</div><div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Posko</TableHead><TableHead>Pengungsi</TableHead><TableHead>Kapasitas</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{shelters.map((shelter) => <TableRow key={shelter.id}><TableCell><p className="font-medium">{shelter.name}</p><p className="mt-1 text-xs text-muted-foreground">{shelter.location} · {shelter.lastUpdate}</p></TableCell><TableCell className="data-number font-medium">{shelter.population.total}</TableCell><TableCell><div className="min-w-28"><div className="mb-2 flex justify-between text-xs"><span>{Math.round((shelter.population.total / shelter.capacity) * 100)}%</span><span>{shelter.capacity}</span></div><Progress value={(shelter.population.total / shelter.capacity) * 100} /></div></TableCell><TableCell><StatusBadge status={shelter.status} /></TableCell></TableRow>)}</TableBody></Table></div></CardContent></OperationalCard>
        {shelterRecommendation ? <RecommendationCard recommendation={shelterRecommendation} title="Saran prioritas posko" /> : null}
      </section>

      <OperationalCard className="overflow-clip"><CardHeader className="py-5"><CardTitle className="text-base">Kebutuhan prioritas lintas posko</CardTitle><CardDescription>Perbandingan kebutuhan dengan stok yang tersedia di posko</CardDescription></CardHeader><CardContent className="p-0"><div className="grid gap-3 p-4 lg:hidden">{needs.map((need) => <article key={need.id} className="rounded-xl border bg-background/72 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{need.item}</p><p className="mt-1 text-xs text-muted-foreground">{need.shelter}</p></div><StatusBadge status={need.urgency} /></div><div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-xs"><span>Diminta<strong className="mt-1 block data-number">{need.requested}</strong></span><span>Tersedia<strong className="mt-1 block data-number">{need.available}</strong></span><span>Kurang<strong className="mt-1 block data-number text-[var(--color-critical-deep)]">-{need.requested - need.available}</strong></span></div></article>)}</div><div className="hidden lg:block"><Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Posko</TableHead><TableHead>Diminta</TableHead><TableHead>Tersedia</TableHead><TableHead>Kesenjangan</TableHead><TableHead>Urgensi</TableHead></TableRow></TableHeader><TableBody>{needs.map((need) => <TableRow key={need.id}><TableCell className="font-medium">{need.item}</TableCell><TableCell className="max-w-56 truncate text-muted-foreground">{need.shelter}</TableCell><TableCell className="data-number">{need.requested.toLocaleString("id-ID")} {need.unit}</TableCell><TableCell className="data-number">{need.available.toLocaleString("id-ID")} {need.unit}</TableCell><TableCell className="data-number font-semibold text-[var(--color-critical-deep)]">-{(need.requested - need.available).toLocaleString("id-ID")}</TableCell><TableCell><StatusBadge status={need.urgency} /></TableCell></TableRow>)}</TableBody></Table></div></CardContent></OperationalCard>
    </div>
  );
}
