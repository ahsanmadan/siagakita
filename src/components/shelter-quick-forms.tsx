"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@/components/action-form";
import { OperationalCard } from "@/components/operational-ui";
import { SubmitButton } from "@/components/submit-button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActionResult } from "@/lib/action-state";
import type { Shelter } from "@/lib/types";

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
  const populationShelter = useMemo(() => shelters.find((shelter) => shelter.id === populationShelterId) ?? shelters[0], [populationShelterId, shelters]);

  if (!populationShelter) return null;

  return (
    <>
      <OperationalCard>
        <CardHeader className="py-5">
          <CardTitle className="text-base">Update cepat populasi</CardTitle>
          <CardDescription>Pilih posko lebih dulu agar pembaruan tidak salah sasaran.</CardDescription>
        </CardHeader>
        <CardContent className="pb-5">
          <ActionForm key={populationShelter.id} action={updateShelterPopulation} className="grid gap-4 sm:grid-cols-2" messageClassName="sm:col-span-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="populationShelter">Posko yang diperbarui</Label>
              <Select name="code" value={populationShelter.id} onValueChange={setPopulationShelterId}>
                <SelectTrigger id="populationShelter" className="bg-card">
                  <SelectValue placeholder="Pilih posko" />
                </SelectTrigger>
                <SelectContent>
                  {shelters.map((shelter) => (
                    <SelectItem key={shelter.id} value={shelter.id}>{shelter.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label htmlFor="populationTotal">Total pengungsi</Label><Input id="populationTotal" name="populationTotal" type="number" min={0} defaultValue={populationShelter.population.total} /></div>
            <div className="grid gap-2"><Label htmlFor="children">Anak-anak</Label><Input id="children" name="children" type="number" min={0} defaultValue={populationShelter.population.children} /></div>
            <div className="grid gap-2"><Label htmlFor="elderly">Lansia</Label><Input id="elderly" name="elderly" type="number" min={0} defaultValue={populationShelter.population.elderly} /></div>
            <div className="grid gap-2"><Label htmlFor="pregnant">Ibu hamil</Label><Input id="pregnant" name="pregnant" type="number" min={0} defaultValue={populationShelter.population.pregnant} /></div>
            <div className="grid gap-2"><Label htmlFor="disability">Disabilitas</Label><Input id="disability" name="disability" type="number" min={0} defaultValue={populationShelter.population.disability} /></div>
            <div className="grid gap-2"><Label htmlFor="note">Catatan</Label><Input id="note" name="note" placeholder="Contoh: update dari koordinator posko" /></div>
            <SubmitButton className="sm:col-span-2">Simpan pembaruan</SubmitButton>
          </ActionForm>
        </CardContent>
      </OperationalCard>
      <OperationalCard>
        <CardHeader className="py-5">
          <CardTitle className="text-base">Ajukan kebutuhan</CardTitle>
          <CardDescription>Kebutuhan baru langsung masuk daftar prioritas posko terpilih.</CardDescription>
        </CardHeader>
        <CardContent className="pb-5">
          <ActionForm action={createNeedRequest} className="grid gap-4 sm:grid-cols-2" messageClassName="sm:col-span-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="needShelter">Posko tujuan kebutuhan</Label>
              <Select name="shelterCode" value={needShelterId} onValueChange={setNeedShelterId}>
                <SelectTrigger id="needShelter" className="bg-card">
                  <SelectValue placeholder="Pilih posko" />
                </SelectTrigger>
                <SelectContent>
                  {shelters.map((shelter) => (
                    <SelectItem key={shelter.id} value={shelter.id}>{shelter.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label htmlFor="needItem">Item</Label><Input id="needItem" name="item" placeholder="Air bersih" required /></div>
            <div className="grid gap-2"><Label htmlFor="needCategory">Kategori</Label><Input id="needCategory" name="category" placeholder="Logistik" /></div>
            <div className="grid gap-2"><Label htmlFor="requested">Diminta</Label><Input id="requested" name="requested" type="number" min={1} defaultValue={100} /></div>
            <div className="grid gap-2"><Label htmlFor="unit">Satuan</Label><Input id="unit" name="unit" defaultValue="paket" /></div>
            <input type="hidden" name="available" value="0" />
            <input type="hidden" name="urgency" value="warning" />
            <SubmitButton className="sm:col-span-2">Ajukan kebutuhan</SubmitButton>
          </ActionForm>
        </CardContent>
      </OperationalCard>
    </>
  );
}
