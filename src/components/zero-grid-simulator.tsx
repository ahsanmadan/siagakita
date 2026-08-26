"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { createReportAction } from "@/lib/actions/operations";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ZeroGridSimulator() {
  const [message, setMessage] = useState("LAPOR#AGM04#AIR_BERSIH#1200#JEMBATAN_PUTUS");

  return (
    <Card className="border-primary/20 bg-card py-0 shadow-none">
      <CardHeader className="pb-3 pt-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-primary">
          <MessageSquareText className="size-4" />
          SMS Zero-Grid
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">Belum terhubung gateway</Badge>
        </div>
        <CardTitle className="text-lg">Input laporan SMS manual</CardTitle>
        <CardDescription className="leading-6">Gateway SMS belum terhubung. Operator dapat memasukkan pesan manual agar laporan tetap masuk ke antrean verifikasi.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        <ActionForm action={createReportAction} className="space-y-4">
          <input type="hidden" name="channel" value="SMS Zero-Grid" />
          <input type="hidden" name="location" value="Nagari Aia Angek" />
          <input type="hidden" name="reporter" value="Adapter Zero-Grid" />
          <input type="hidden" name="severity" value="critical" />
          <input type="hidden" name="summary" value={`Pesan Zero-Grid diterima: ${message}`} />
          <div className="space-y-2"><Label htmlFor="sms">Isi pesan</Label><Input id="sms" value={message} onChange={(event) => setMessage(event.target.value)} className="h-12 font-mono text-xs" /></div>
          <div className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Format:</strong> LAPOR#KODE#KEBUTUHAN#JUMLAH#KETERANGAN. Input ini tidak dikirim ke operator seluler; data disimpan sebagai laporan untuk ditinjau petugas.</div>
          <SubmitButton pendingLabel="Mencatat laporan..." className="w-full">Masukkan antrean verifikasi</SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
