"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileText, Forklift, Globe, Home, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { NavMainItem } from "@/navigation/sidebar/sidebar-items";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";

type SearchItem = {
  id: string;
  group: string;
  label: string;
  url: string;
  icon?: NavMainItem["icon"];
  disabled?: boolean;
  newTab?: boolean;
  keywords?: string;
};

const emergencyGroupLabel = "Aksi Darurat Cepat";

const emergencyActions: SearchItem[] = [
  {
    id: "qa-kejadian",
    group: emergencyGroupLabel,
    label: "Entri Kejadian Bencana Baru",
    url: "/kejadian",
    icon: AlertTriangle,
    keywords: "darurat sos evakuasi bencana kejadian baru",
  },
  {
    id: "qa-logistik",
    group: emergencyGroupLabel,
    label: "Alokasi & Distribusi Logistik AI",
    url: "/logistik",
    icon: Forklift,
    keywords: "distribusi bantuan gudang alokasi armada logistik",
  },
  {
    id: "qa-posko",
    group: emergencyGroupLabel,
    label: "Manajemen Kapasitas Posko",
    url: "/posko",
    icon: Home,
    keywords: "pengungsi kapasitas posko shelter hunian",
  },
  {
    id: "qa-laporan",
    group: emergencyGroupLabel,
    label: "Triase Laporan & SMS Zero-Grid",
    url: "/laporan",
    icon: FileText,
    keywords: "verifikasi triase sms zero-grid laporan warga",
  },
  {
    id: "qa-peta-publik",
    group: emergencyGroupLabel,
    label: "Buka Peta Situasi Publik (Live)",
    url: "/peta-publik",
    icon: Globe,
    newTab: true,
    keywords: "peta live publik situasi map",
  },
];

const emergencyUrls = new Set(emergencyActions.map((action) => action.url));

const sidebarGroupLabels = new Set(sidebarItems.flatMap((group) => (group.label ? [group.label] : [])));

function getSubItemGroup(groupLabel: string | undefined, itemTitle: string) {
  return sidebarGroupLabels.has(itemTitle) ? (groupLabel ?? "Operasional") : itemTitle;
}

const searchItems: SearchItem[] = sidebarItems
  .flatMap((group) =>
    group.items.flatMap((item) => {
      if (item.subItems) {
        return item.subItems.map((sub) => ({
          id: sub.id,
          group: getSubItemGroup(group.label, item.title),
          label: sub.title,
          url: sub.url,
          icon: item.icon,
          disabled: sub.disabled,
          newTab: sub.newTab,
        }));
      }
      return [
        {
          id: item.id,
          group: group.label ?? "Operasional",
          label: item.title,
          url: item.url,
          icon: item.icon,
          disabled: item.disabled,
          newTab: item.newTab,
        },
      ];
    }),
  )
  .filter((item) => !emergencyUrls.has(item.url));

function getAvailableItems(items: SearchItem[]) {
  return items.filter((item) => !item.disabled);
}

const recommendations = getAvailableItems(searchItems);

function groupBy(items: SearchItem[]) {
  const groups = [...new Set(items.map((item) => item.group))];
  return groups.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  }));
}

export function SearchDialog() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "j") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) setQuery("");
  };

  const handleSelect = (item: SearchItem) => {
    if (item.disabled) return;
    handleOpenChange(false);
    if (item.newTab) {
      window.open(item.url, "_blank", "noopener,noreferrer");
    } else {
      router.push(item.url);
    }
  };

  const renderItem = (item: SearchItem, group: string) => (
    <CommandItem
      disabled={item.disabled}
      key={`${group}-${item.id}`}
      value={`${item.group} ${item.label} ${item.keywords ?? ""}`}
      onSelect={() => handleSelect(item)}
    >
      <span className="flex min-w-0 items-center gap-2">
        {item.icon && <item.icon className="size-4 shrink-0" />}
        <span className="truncate">{item.label}</span>
      </span>
    </CommandItem>
  );

  const renderGroups = (items: SearchItem[]) =>
    groupBy(items).map(({ group, items: groupItems }) => (
      <React.Fragment key={group}>
        <CommandSeparator />
        <CommandGroup heading={group}>{groupItems.map((item) => renderItem(item, group))}</CommandGroup>
      </React.Fragment>
    ));

  return (
    <>
      <Button
        onClick={() => handleOpenChange(true)}
        variant="outline"
        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 border-border/80 bg-muted/40 hover:bg-muted"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">Cari modul, posko, armada…</span>
        <span className="sm:hidden">Cari…</span>
        <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border bg-background px-1 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-[10px]">Ctrl</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <Command>
          <CommandInput placeholder="Ketik kata kunci pencarian..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>Tidak ada menu atau data yang cocok.</CommandEmpty>
            <CommandGroup heading={emergencyGroupLabel}>
              {emergencyActions.map((item) => renderItem(item, emergencyGroupLabel))}
            </CommandGroup>
            {query ? renderGroups(searchItems) : renderGroups(recommendations)}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
