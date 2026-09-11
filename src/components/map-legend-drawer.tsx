"use client";

import { Layers3 } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

export function MapLegendDrawer({ publicMode = false }: { publicMode?: boolean }) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="bg-card/90 backdrop-blur-md sm:hidden"><Layers3 /> Legenda</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-display">Legenda peta</DrawerTitle>
          <DrawerDescription>{publicMode ? "Status wilayah dan posko yang aman ditampilkan untuk masyarakat." : "Tingkat urgensi marker pada ruang operasi."}</DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-3 px-4 pb-8">
          {(["critical", "major", "warning", "safe"] as const).map((status) => <StatusBadge key={status} status={status} className="w-fit" />)}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
