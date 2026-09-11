"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, Info, Sparkles } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { OperationalCard } from "@/components/operational-ui";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActionResult } from "@/lib/action-state";
import type { Shelter } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS = [
  "Logistik",
  "Pangan",
  "Sandang",
  "Kesehatan",
  "Higiene",
  "Hunian",
];

const COMMON_SUGGESTIONS = [
  { item: "Air bersih", category: "Pangan", unit: "liter", requested: 500 },
  { item: "Makanan siap saji", category: "Pangan", unit: "porsi", requested: 200 },
  { item: "Selimut", category: "Sandang", unit: "unit", requested: 100 },
  { item: "Paket kebersihan", category: "Higiene", unit: "paket", requested: 50 },
  { item: "Obat-obatan darurat", category: "Kesehatan", unit: "paket", requested: 30 },
];

export function ShelterQuickForms({
  shelters,
  updateShelterPopulation,
  createNeedRequest,
}: {
  shelters: Shelter[];
  updateShelterPopulation: (formData: FormData) => Promise<ActionResult>;
  createNeedRequest: (formData: FormData) => Promise<ActionResult>;
}) {
  const firstShelterId = shelters[0]?.id ?? "";
  const [populationShelterId, setPopulationShelterId] = useState(firstShelterId);
  const [needShelterId, setNeedShelterId] = useState(firstShelterId);

  // Population Form States for interactive validation
  const populationShelter = useMemo(
    () => shelters.find((shelter) => shelter.id === populationShelterId) ?? shelters[0],
    [populationShelterId, shelters],
  );

  const [popTotal, setPopTotal] = useState<number>(populationShelter?.population?.total ?? 0);
  const [popChildren, setPopChildren] = useState<number>(populationShelter?.population?.children ?? 0);
  const [popElderly, setPopElderly] = useState<number>(populationShelter?.population?.elderly ?? 0);
  const [popPregnant, setPopPregnant] = useState<number>(populationShelter?.population?.pregnant ?? 0);
  const [popDisability, setPopDisability] = useState<number>(populationShelter?.population?.disability ?? 0);

  // Sync population form fields when selected shelter changes
  useEffect(() => {
    if (populationShelter) {
      setPopTotal(populationShelter.population.total);
      setPopChildren(populationShelter.population.children);
      setPopElderly(populationShelter.population.elderly);
      setPopPregnant(populationShelter.population.pregnant);
      setPopDisability(populationShelter.population.disability);
    }
  }, [populationShelter]);

  // Validation metrics for population
  const vulnerableTotal = Number(popChildren || 0) + Number(popElderly || 0) + Number(popPregnant || 0) + Number(popDisability || 0);
  const isVulnerableOverTotal = Number(popTotal || 0) > 0 && vulnerableTotal > Number(popTotal || 0);
  const capacity = populationShelter?.capacity || 1;
  const occupancyRatio = Math.round((Number(popTotal || 0) / capacity) * 100);
  const isOverCapacity = Number(popTotal || 0) > capacity;

  // Need Form States
  const [item, setItem] = useState("");
  const [category, setCategory] = useState("Logistik");
  const [requested, setRequested] = useState("100");
  const [unit, setUnit] = useState("paket");
  const [urgency, setUrgency] = useState("warning");

  const needShelter = useMemo(
    () => shelters.find((shelter) => shelter.id === needShelterId) ?? shelters[0],
    [needShelterId, shelters],
  );

  if (!populationShelter || !needShelter) return null;

  const existingNeeds = needShelter.needs ?? [];

  return (
    <div id="shelter-quick-forms-section" className="flex flex-col gap-6">
      {/* Form 1: Update Cepat Populasi */}
      <OperationalCard>
        <CardHeader className="py-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="font-heading text-base font-bold text-foreground">
                1. Update Cepat Populasi Posko
              </CardTitle>
              <CardDescription className="font-sans text-xs text-muted-foreground mt-0.5">
                Pastikan data pengungsi dan kelompok rentan terverifikasi sebelum diajukan ke Pusdalops.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-sans text-[11px] font-medium hidden sm:inline-flex">
              Daya Tampung: {capacity.toLocaleString("id-ID")} Jiwa
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-5 font-sans">
          <ActionForm
            key={populationShelter.id}
            action={updateShelterPopulation}
            className="grid gap-4 sm:grid-cols-2"
            messageClassName="sm:col-span-2"
          >
            <input type="hidden" name="code" value={populationShelter.id} />

            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="populationShelter" className="text-xs font-medium text-foreground">
                Posko yang Diperbarui
              </Label>
              <Select value={populationShelter.id} onValueChange={setPopulationShelterId}>
                <SelectTrigger id="populationShelter" className="bg-card text-xs">
                  <SelectValue placeholder="Pilih posko" />
                </SelectTrigger>
                <SelectContent>
                  {shelters.map((shelter) => (
                    <SelectItem key={shelter.id} value={shelter.id} className="text-xs">
                      {shelter.name} — {shelter.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total Pengungsi with Helper & Capacity Status */}
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="populationTotal" className="text-xs font-medium text-foreground">
                  Total Pengungsi (Jiwa)
                </Label>
                <span className={cn(
                  "text-[11px] font-semibold tabular-nums",
                  isOverCapacity ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                )}>
                  {occupancyRatio}% Keterisian
                </span>
              </div>
              <Input
                id="populationTotal"
                name="populationTotal"
                type="number"
                min={0}
                value={popTotal}
                onChange={(e) => setPopTotal(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-9 text-xs"
                required
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Kapasitas: {capacity.toLocaleString("id-ID")} jiwa · Sisa daya tampung:{" "}
                <span className={cn("font-medium", isOverCapacity ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                  {Math.max(0, capacity - popTotal)} jiwa
                </span>
              </p>
            </div>

            {/* Anak-anak */}
            <div className="grid gap-1.5">
              <Label htmlFor="children" className="text-xs font-medium text-foreground">
                Anak-anak & Balita (Jiwa)
              </Label>
              <Input
                id="children"
                name="children"
                type="number"
                min={0}
                value={popChildren}
                onChange={(e) => setPopChildren(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-9 text-xs"
                required
              />
              <p className="text-[11px] text-muted-foreground">Termasuk bayi dan anak usia &lt; 12 tahun</p>
            </div>

            {/* Lansia */}
            <div className="grid gap-1.5">
              <Label htmlFor="elderly" className="text-xs font-medium text-foreground">
                Lansia &gt; 60 Tahun (Jiwa)
              </Label>
              <Input
                id="elderly"
                name="elderly"
                type="number"
                min={0}
                value={popElderly}
                onChange={(e) => setPopElderly(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-9 text-xs"
                required
              />
              <p className="text-[11px] text-muted-foreground">Prioritas obat rutin dan pendampingan</p>
            </div>

            {/* Ibu Hamil */}
            <div className="grid gap-1.5">
              <Label htmlFor="pregnant" className="text-xs font-medium text-foreground">
                Ibu Hamil & Menyusui (Jiwa)
              </Label>
              <Input
                id="pregnant"
                name="pregnant"
                type="number"
                min={0}
                value={popPregnant}
                onChange={(e) => setPopPregnant(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-9 text-xs"
                required
              />
              <p className="text-[11px] text-muted-foreground">Prioritas gizi tambahan dan sanitasi khusus</p>
            </div>

            {/* Disabilitas */}
            <div className="grid gap-1.5">
              <Label htmlFor="disability" className="text-xs font-medium text-foreground">
                Penyandang Disabilitas (Jiwa)
              </Label>
              <Input
                id="disability"
                name="disability"
                type="number"
                min={0}
                value={popDisability}
                onChange={(e) => setPopDisability(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-9 text-xs"
                required
              />
              <p className="text-[11px] text-muted-foreground">Membutuhkan aksesibilitas tenda dan kursi roda/tongkat</p>
            </div>

            {/* Catatan */}
            <div className="grid gap-1.5">
              <Label htmlFor="note" className="text-xs font-medium text-foreground">
                Catatan Lapangan <span className="text-muted-foreground font-normal">(Opsional)</span>
              </Label>
              <Input
                id="note"
                name="note"
                placeholder="Contoh: Tambahan 12 KK dari evakuasi bantaran sungai"
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">Sumber atau keterangan pembaruan</p>
            </div>

            {/* Realtime Validation Warning Alerts */}
            {isVulnerableOverTotal && (
              <div className="sm:col-span-2 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-amber-950 dark:text-amber-100">
                    Peringatan Proporsi Kelompok Rentan
                  </p>
                  <p className="text-amber-900/90 dark:text-amber-300 leading-relaxed">
                    Total kelompok rentan terhitung <strong>{vulnerableTotal} jiwa</strong> (anak, lansia, hamil, disabilitas), melebihi total pengungsi tercatat (<strong>{popTotal} jiwa</strong>). Mohon cek kembali kebenaran angka.
                  </p>
                </div>
              </div>
            )}

            {isOverCapacity && (
              <div className="sm:col-span-2 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-900 dark:text-red-200">
                <AlertTriangle className="size-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-red-950 dark:text-red-100">
                    Posko Melebihi Kapasitas Maksimal ({occupancyRatio}%)
                  </p>
                  <p className="text-red-900/90 dark:text-red-300 leading-relaxed">
                    Kelebihan {popTotal - capacity} jiwa di atas kuota resmi. Disarankan segera ajukan tenda peleton tambahan atau koordinasikan pengalihan ke posko terdekat.
                  </p>
                </div>
              </div>
            )}

            {/* Proportional Align-Right Action Button */}
            <div className="sm:col-span-2 flex items-center justify-end pt-2 border-t border-border/60">
              <SubmitButton className="w-auto px-6 font-sans text-xs">
                Simpan Pembaruan Populasi
              </SubmitButton>
            </div>
          </ActionForm>
        </CardContent>
      </OperationalCard>

      {/* Form 2: Ajukan Kebutuhan */}
      <OperationalCard>
        <CardHeader className="py-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="font-heading text-base font-bold text-foreground">
                2. Ajukan Kebutuhan Darurat Posko
              </CardTitle>
              <CardDescription className="font-sans text-xs text-muted-foreground mt-0.5">
                Kebutuhan yang diajukan langsung masuk antrean alokasi logistik BNPB/BPBD.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-sans text-[11px] font-medium hidden sm:inline-flex">
              Tujuan: {needShelter.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-5 font-sans">
          <ActionForm
            key={needShelter.id}
            action={createNeedRequest}
            className="grid gap-4 sm:grid-cols-2"
            messageClassName="sm:col-span-2"
            onSuccess={() => {
              setItem("");
              setRequested("100");
            }}
          >
            <input type="hidden" name="shelterCode" value={needShelter.id} />
            <input type="hidden" name="category" value={category} />
            <input type="hidden" name="urgency" value={urgency} />
            <input type="hidden" name="available" value="0" />

            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="needShelter" className="text-xs font-medium text-foreground">
                Posko Pemohon Kebutuhan
              </Label>
              <Select
                value={needShelter.id}
                onValueChange={(val) => {
                  setNeedShelterId(val);
                  setItem("");
                }}
              >
                <SelectTrigger id="needShelter" className="bg-card text-xs">
                  <SelectValue placeholder="Pilih posko pemohon" />
                </SelectTrigger>
                <SelectContent>
                  {shelters.map((shelter) => (
                    <SelectItem key={shelter.id} value={shelter.id} className="text-xs">
                      {shelter.name} — {shelter.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Enhanced Quick-Fill Section */}
            <div className="sm:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <span>
                    {existingNeeds.length > 0
                      ? `Kebutuhan tercatat di ${needShelter.name}:`
                      : "Pilihan komoditas umum darurat:"}
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px] font-medium h-5 bg-background border text-primary">
                  Klik item untuk isi cepat
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {(existingNeeds.length > 0
                  ? existingNeeds.map((need) => ({
                      item: need.item,
                      category: need.category,
                      unit: need.unit,
                      requested: Math.max(1, need.requested - need.available),
                    }))
                  : COMMON_SUGGESTIONS
                ).map((sug) => (
                  <button
                    key={sug.item}
                    type="button"
                    onClick={() => {
                      setItem(sug.item);
                      setCategory(sug.category);
                      setUnit(sug.unit);
                      setRequested(String(sug.requested));
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer text-left shadow-2xs",
                      item === sug.item
                        ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "border-border/80 bg-background hover:border-primary/50 hover:bg-muted text-foreground"
                    )}
                  >
                    <span>{sug.item}</span>
                    <span className={cn(
                      "text-[11px] tabular-nums font-normal",
                      item === sug.item ? "text-primary-foreground/90" : "text-muted-foreground"
                    )}>
                      ({sug.requested} {sug.unit})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Komoditas */}
            <div className="grid gap-1.5">
              <Label htmlFor="needItem" className="text-xs font-medium text-foreground">
                Nama Komoditas / Barang
              </Label>
              <Input
                id="needItem"
                name="item"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="Contoh: Beras medium / Terpal 4x6"
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Input Kategori */}
            <div className="grid gap-1.5">
              <Label htmlFor="needCategory" className="text-xs font-medium text-foreground">
                Kategori Logistik
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="needCategory" className="bg-card text-xs">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Input Kuantitas Diminta */}
            <div className="grid gap-1.5">
              <Label htmlFor="requested" className="text-xs font-medium text-foreground">
                Jumlah Diminta
              </Label>
              <Input
                id="requested"
                name="requested"
                type="number"
                min={1}
                value={requested}
                onChange={(e) => setRequested(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Input Satuan */}
            <div className="grid gap-1.5">
              <Label htmlFor="unit" className="text-xs font-medium text-foreground">
                Satuan Ukur
              </Label>
              <Input
                id="unit"
                name="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="paket / kg / liter / dus / lembar"
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Tingkat Urgensi */}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="needUrgency" className="text-xs font-medium text-foreground">
                Tingkat Urgensi Kebutuhan
              </Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger id="needUrgency" className="bg-card text-xs">
                  <SelectValue placeholder="Pilih tingkat urgensi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warning" className="text-xs">
                    Prioritas Tinggi (Warning) — Dibutuhkan dalam 24 jam
                  </SelectItem>
                  <SelectItem value="critical" className="text-xs">
                    Sangat Mendesak (Critical) — Stok habis / kritis, segera dikirim
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Live Request Summary (Preview Ringkas Sebelum Submit) */}
            <div className="sm:col-span-2 rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs border-b border-border/60 pb-2">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Eye className="size-3.5 text-primary" />
                  Pratinjau Pengajuan Kebutuhan
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Target Posko: <strong className="text-foreground">{needShelter.name}</strong>
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted-foreground">Komoditas</span>
                  <p className="font-semibold text-foreground truncate">{item.trim() ? item : "Belum diisi"}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted-foreground">Kategori</span>
                  <p className="font-medium text-foreground">{category}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted-foreground">Jumlah Diminta</span>
                  <p className="font-semibold text-foreground tabular-nums">
                    {requested ? `${Number(requested).toLocaleString("id-ID")} ${unit}` : "0"}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted-foreground">Tingkat Urgensi</span>
                  <div>
                    {urgency === "critical" ? (
                      <Badge variant="destructive" className="text-[10px] h-5 font-semibold">
                        Sangat Mendesak
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 text-[10px] h-5 font-semibold">
                        Prioritas Tinggi
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Proportional Align-Right Action Button */}
            <div className="sm:col-span-2 flex items-center justify-end pt-2 border-t border-border/60">
              <SubmitButton className="w-auto px-6 font-sans text-xs">
                Kirim Pengajuan Kebutuhan
              </SubmitButton>
            </div>
          </ActionForm>
        </CardContent>
      </OperationalCard>
    </div>
  );
}
