"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface MapLayerState {
  earthquake: boolean;
  volcanoLevel1: boolean;
  volcanoLevel2: boolean;
  volcanoLevel3: boolean;
  volcanoLevel4: boolean;
}

export const DEFAULT_MAP_LAYERS: MapLayerState = {
  earthquake: true,
  volcanoLevel1: true,
  volcanoLevel2: true,
  volcanoLevel3: true,
  volcanoLevel4: true,
};

interface MapLayerControlProps {
  layers: MapLayerState;
  onLayerToggle: (key: keyof MapLayerState) => void;
  className?: string;
}

const LAYER_OPTIONS: Array<{ key: keyof MapLayerState; label: string }> = [
  { key: "earthquake", label: "Gempa Bumi" },
  { key: "volcanoLevel1", label: "Gunung Api - Level I (Normal)" },
  { key: "volcanoLevel2", label: "Gunung Api - Level II (Waspada)" },
  { key: "volcanoLevel3", label: "Gunung Api - Level III (Siaga)" },
  { key: "volcanoLevel4", label: "Gunung Api - Level IV (Awas)" },
];

export function MapLayerControl({
  layers,
  onLayerToggle,
  className,
}: MapLayerControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("public-map-layer-control pointer-events-auto", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "group relative flex size-11 items-center justify-center rounded-xl border border-border/80 bg-card text-foreground shadow-md transition-all duration-200 hover:scale-105 hover:border-border hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 cursor-pointer",
              isOpen && "ring-2 ring-primary/40 border-primary/50 shadow-primary/10",
            )}
            aria-label="Pilih lapisan peta yang ingin ditampilkan"
            title="Pilih Lapisan Peta"
          >
            {/* 3D Stacked isometric layers icon matching reference */}
            <svg
              className="size-6 text-foreground/80 transition-transform duration-200 group-hover:scale-105"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" fill="currentColor" fillOpacity="0.08" />
              <polyline points="2 12 12 17 22 12" />
              <polyline points="2 17 12 22 22 17" />
            </svg>
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="start"
          sideOffset={10}
          className="w-auto min-w-[240px] max-w-[320px] rounded-xl border border-border/90 bg-popover/98 p-3.5 shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div className="flex flex-col space-y-2.5">
            {LAYER_OPTIONS.map(({ key, label }) => {
              const isChecked = layers[key];
              return (
                <label
                  key={key}
                  className="flex items-center gap-2.5 cursor-pointer select-none text-[13px] font-medium text-foreground/90 transition-colors hover:text-foreground"
                >
                  <Checkbox
                    id={`layer-checkbox-${key}`}
                    checked={isChecked}
                    onCheckedChange={() => onLayerToggle(key)}
                    className="size-4.5 rounded-[4px] border-border data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white"
                  />
                  <span className="leading-none">{label}</span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
