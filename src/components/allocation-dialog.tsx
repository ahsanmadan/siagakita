"use client";

import { useState } from "react";
import { AlertCircle, Clock, Sparkles, Truck } from "lucide-react";
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

type ShelterOption = Pick<Shelter, "id" | "name"> & {
  location?: string;
  needs?: Shelter["needs"];
};
type InventoryOption = Pick<Inventory, "id" | "item" | "stock" | "reserved" | "unit">;

function getDynamicEta(hoursOffset = 3): string {
  const date = new Date(Date.now() + hoursOffset * 60 * 60 * 1000);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `Hari ini ${hours}.${minutes} WIB`;
}

function getTomorrowEta(): string {
  return "Besok 08.00 WIB";
}

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
  const [eta, setEta] = useState(prefill?.eta ?? getDynamicEta(3));

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setShelterCode(prefill?.shelterCode ?? shelters[0]?.id ?? "");
    setInventoryItemId(prefill?.inventoryItemId ?? inventory[0]?.id ?? "");
    setQuantity(String(prefill?.quantity ?? 100));
    setEta(prefill?.eta ?? getDynamicEta(3));
  }

  const selectedShelter = shelters.find((s) => s.id === shelterCode);
  const unmetNeeds = (selectedShelter?.needs ?? []).filter((need) => need.requested > need.available);

  const selectedInventory = inventory.find((item) => item.id === inventoryItemId);
  const availableStock = selectedInventory
    ? Math.max(0, selectedInventory.stock - selectedInventory.reserved)
    : 0;
  const parsedQty = Number(quantity) || 0;
  const isOverStock = availableStock > 0 && parsedQty > availableStock;

  function handleSelectNeed(need: NonNullable<Shelter["needs"]>[number]) {
    const deficit = Math.max(1, need.requested - need.available);
    const needLower = need.item.toLowerCase();

    const matchedItem = inventory.find((inv) => {
      const invLower = inv.item.toLowerCase();
      return invLower.includes(needLower) || needLower.includes(invLower);
    });

    if (matchedItem) {
      setInventoryItemId(matchedItem.id);
      const stock = Math.max(0, matchedItem.stock - matchedItem.reserved);
      const allocQty = stock > 0 ? Math.min(deficit, stock) : deficit;
      setQuantity(String(allocQty));
    } else {
      setQuantity(String(deficit));
    }
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
      <DialogContent className="max-w-lg">
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

        <ActionForm action={allocateDistribution} className="py-2 gap-3.5" onSuccess={() => setOpen(false)}>
          <div className="grid gap-2">
            <Label htmlFor="shelterCode">Posko Tujuan</Label>
            <Select name="shelterCode" value={shelterCode} onValueChange={setShelterCode}>
              <SelectTrigger id="shelterCode" className="h-auto min-h-9 py-1.5">
                <SelectValue placeholder="Pilih posko" />
              </SelectTrigger>
              <SelectContent>
                {shelters.map((shelter) => (
                  <SelectItem key={shelter.id} value={shelter.id}>
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{shelter.name}</span>
                      {shelter.location ? (
                        <span className="text-[11px] text-muted-foreground">{shelter.location}</span>
                      ) : null}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {unmetNeeds.length > 0 ? (
              <div className="rounded-lg border border-border/70 bg-muted/40 p-2.5 space-y-1.5 mt-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">Kebutuhan Posko ({selectedShelter?.location || selectedShelter?.name}):</span>
                  <span className="text-[11px] text-muted-foreground">Klik untuk auto-fill</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {unmetNeeds.map((need) => {
                    const deficit = need.requested - need.available;
                    return (
                      <button
                        key={need.id || need.item}
                        type="button"
                        onClick={() => handleSelectNeed(need)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border transition-colors cursor-pointer text-left",
                          need.urgency === "critical"
                            ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-500/20"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 hover:bg-amber-500/20",
                        )}
                        title={`Klik untuk mengisi ${need.item} (${deficit} ${need.unit})`}
                      >
                        <span>{need.item}</span>
                        <span className="tabular-nums font-semibold">+{deficit.toLocaleString("id-ID")} {need.unit}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : selectedShelter ? (
              <p className="text-[11px] text-muted-foreground">
                Kebutuhan pokok posko ini terpenuhi atau dapat dialokasikan cadangan tambahan secara manual.
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="inventoryItemId">Item Stok Gudang</Label>
            <Select name="inventoryItemId" value={inventoryItemId} onValueChange={setInventoryItemId}>
              <SelectTrigger id="inventoryItemId">
                <SelectValue placeholder="Pilih stok" />
              </SelectTrigger>
              <SelectContent>
                {inventory.map((item) => {
                  const free = Math.max(0, item.stock - item.reserved);
                  return (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <span>{item.item}</span>
                        <span className={cn("text-xs tabular-nums font-medium", free === 0 ? "text-destructive" : "text-muted-foreground")}>
                          {free.toLocaleString("id-ID")} {item.unit} siap
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="quantity">Jumlah Alokasi</Label>
              {availableStock > 0 && parsedQty !== availableStock && (
                <button
                  type="button"
                  onClick={() => setQuantity(String(availableStock))}
                  className="text-primary hover:underline text-xs font-medium cursor-pointer"
                >
                  Set Maksimal ({availableStock.toLocaleString("id-ID")})
                </button>
              )}
            </div>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Stok siap di gudang:{" "}
                <strong className="text-foreground font-semibold">
                  {availableStock.toLocaleString("id-ID")} {selectedInventory?.unit ?? "unit"}
                </strong>
              </span>
            </div>
            {isOverStock && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>Jumlah melebihi stok siap alokasi ({availableStock.toLocaleString("id-ID")} {selectedInventory?.unit}). Alokasi mungkin dipotong otomatis oleh sistem.</span>
              </div>
            )}
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
            <div className="flex items-center gap-1.5">
              <Clock className="size-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground mr-1">Opsi Cepat:</span>
              <button
                type="button"
                onClick={() => setEta(getDynamicEta(2))}
                className="px-2 py-0.5 rounded text-[11px] bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors cursor-pointer"
              >
                +2 Jam
              </button>
              <button
                type="button"
                onClick={() => setEta(getDynamicEta(4))}
                className="px-2 py-0.5 rounded text-[11px] bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors cursor-pointer"
              >
                +4 Jam
              </button>
              <button
                type="button"
                onClick={() => setEta(getTomorrowEta())}
                className="px-2 py-0.5 rounded text-[11px] bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors cursor-pointer"
              >
                Besok Pagi
              </button>
            </div>
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
