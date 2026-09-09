"use client";

import { useState } from "react";
import { Sparkles, Truck } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { allocateDistribution } from "@/lib/actions/operations";
import type { AllocationPrefill } from "@/lib/recommendation-allocation";
import type { Inventory, Shelter } from "@/lib/types";
import { cn } from "@/lib/utils";

type ShelterOption = Pick<Shelter, "id" | "name">;
type InventoryOption = Pick<Inventory, "id" | "item" | "stock" | "reserved" | "unit">;

export function AllocationDialog({
  shelters,
  inventory,
  prefill,
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "sm",
  triggerClassName,
  fromRecommendation = false,
}: {
  shelters: ShelterOption[];
  inventory: InventoryOption[];
  prefill?: AllocationPrefill | null;
  triggerLabel: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerSize?: "sm" | "default" | "lg";
  triggerClassName?: string;
  fromRecommendation?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [shelterCode, setShelterCode] = useState(prefill?.shelterCode ?? shelters[0]?.id ?? "");
  const [inventoryItemId, setInventoryItemId] = useState(prefill?.inventoryItemId ?? inventory[0]?.id ?? "");
  const [quantity, setQuantity] = useState(String(prefill?.quantity ?? 100));
  const [eta, setEta] = useState(prefill?.eta ?? "Hari ini 18.00 WIB");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setShelterCode(prefill?.shelterCode ?? shelters[0]?.id ?? "");
    setInventoryItemId(prefill?.inventoryItemId ?? inventory[0]?.id ?? "");
    setQuantity(String(prefill?.quantity ?? 100));
    setEta(prefill?.eta ?? "Hari ini 18.00 WIB");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size={triggerSize}
          variant={triggerVariant}
          className={cn(
            "gap-1.5 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-px hover:shadow-sm active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none",
            triggerClassName,
          )}
        >
          {fromRecommendation ? <Sparkles className="size-4" /> : <Truck className="size-4" />}
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alokasi Distribusi Logistik</DialogTitle>
          <DialogDescription>
            {fromRecommendation
              ? "Form sudah terisi sesuai saran prioritas. Periksa posko, item, dan jumlah sebelum mengirim armada."
              : "Pilih posko penerima dan jumlah bantuan. Sistem mengunci stok gudang secara otomatis."}
          </DialogDescription>
        </DialogHeader>
        {fromRecommendation && prefill ? (
          <p className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
            Terisi dari saran: <span className="font-medium text-foreground">{prefill.shelterName}</span> ·{" "}
            <span className="font-medium text-foreground">{prefill.inventoryLabel}</span> ·{" "}
            <span className="font-medium text-foreground">
              {prefill.quantity.toLocaleString("id-ID")} {prefill.unit}
            </span>
          </p>
        ) : null}
        <ActionForm action={allocateDistribution} className="py-2 gap-3" onSuccess={() => setOpen(false)}>
          <div className="grid gap-2">
            <Label htmlFor="shelterCode">Posko Tujuan</Label>
            <Select name="shelterCode" value={shelterCode} onValueChange={setShelterCode}>
              <SelectTrigger id="shelterCode">
                <SelectValue placeholder="Pilih posko" />
              </SelectTrigger>
              <SelectContent>
                {shelters.map((shelter) => (
                  <SelectItem key={shelter.id} value={shelter.id}>
                    {shelter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="inventoryItemId">Item Stok</Label>
            <Select name="inventoryItemId" value={inventoryItemId} onValueChange={setInventoryItemId}>
              <SelectTrigger id="inventoryItemId">
                <SelectValue placeholder="Pilih stok" />
              </SelectTrigger>
              <SelectContent>
                {inventory.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.item} · {item.stock - item.reserved} {item.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="quantity">Jumlah</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eta">Perkiraan Tiba (ETA)</Label>
            <Input
              id="eta"
              name="eta"
              value={eta}
              onChange={(event) => setEta(event.target.value)}
              required
            />
          </div>
          <input type="hidden" name="priority" value="warning" />
          {fromRecommendation ? (
            <input type="hidden" name="notes" value="Alokasi mengikuti saran prioritas logistik." />
          ) : null}
          <SubmitButton pendingLabel="Mengirim armada...">Kirim Armada</SubmitButton>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
