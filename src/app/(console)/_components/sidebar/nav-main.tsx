"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, PlusCircleIcon, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/auth-types";
import { roleNavigation } from "@/lib/role-ui";
import type {
  NavBadge,
  NavGroup,
  NavMainItem,
  NavMainLinkItem,
  NavMainParentItem,
} from "@/navigation/sidebar/sidebar-items";

interface NavMainProps {
  readonly items: readonly NavGroup[];
  readonly role?: AppRole;
}
interface NavItemProps {
  readonly item: NavMainItem;
  readonly isItemActive: (item: NavMainItem) => boolean;
  readonly isSubItemActive: (url: string) => boolean;
  readonly isSubmenuOpen: (item: NavMainParentItem) => boolean;
}

interface NavLinkItemProps {
  readonly item: NavMainLinkItem;
  readonly isActive: boolean;
  readonly showIconFallback: boolean;
}

interface NavLinkIconProps {
  readonly item: NavMainLinkItem;
  readonly showFallback: boolean;
}

interface NavDropdownItemProps {
  readonly item: NavMainParentItem;
  readonly isActive: boolean;
  readonly isSubItemActive: (url: string) => boolean;
}

interface NavCollapsibleItemProps {
  readonly item: NavMainParentItem;
  readonly isActive: boolean;
  readonly defaultOpen: boolean;
  readonly isSubItemActive: (url: string) => boolean;
}

function CollapsedIconFallback({ title }: { title: string }) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center rounded-xs font-medium text-[10px] outline">
      {title.slice(0, 1)}
    </span>
  );
}

function hasSubItems(item: NavMainItem): item is NavMainParentItem {
  return Boolean(item.subItems?.length);
}

export function NavMain({ items, role }: NavMainProps) {
  const path = usePathname();

  const allowedNavIds = role ? roleNavigation(role) : null;
  const filteredGroups = allowedNavIds
    ? items
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => allowedNavIds.includes(item.id)),
        }))
        .filter((group) => group.items.length > 0)
    : items;

  const quickAction = (() => {
    switch (role) {
      case "field_officer":
        return {
          title: "Lapor Lapangan",
          url: "/laporan",
          tooltip: "Entri Laporan Situasi",
        };
      case "shelter_manager":
        return {
          title: "Kelola Posko",
          url: "/posko",
          tooltip: "Data Pengungsi & Kebutuhan",
        };
      case "warehouse_manager":
        return {
          title: "Cek Logistik",
          url: "/logistik",
          tooltip: "Stok & Distribusi Bantuan",
        };
      case "admin":
      case "bpbd_operator":
      default:
        return {
          title: "Input Kejadian",
          url: "/kejadian",
          tooltip: "Entri Kejadian Cepat",
        };
    }
  })();

  const isItemActive = (item: NavMainItem) => {
    if (hasSubItems(item)) {
      return item.subItems.some((sub) => path.startsWith(sub.url));
    }

    return path === item.url;
  };

  const isSubItemActive = (url: string) => {
    return path === url;
  };

  const isSubmenuOpen = (item: NavMainParentItem) => {
    return item.subItems.some((sub) => path.startsWith(sub.url));
  };

  return (
    <>
      <SidebarGroup className="py-2">
        <SidebarGroupContent className="flex flex-col gap-2">
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center">
              <SidebarMenuButton
                asChild
                tooltip={quickAction.tooltip}
                className="h-11 min-w-8 bg-primary px-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground dark:bg-sidebar-accent dark:text-sidebar-foreground dark:border dark:border-sidebar-border dark:hover:bg-sidebar-accent/80 dark:hover:border-sidebar-border/80 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!"
              >
                <Link href={quickAction.url}>
                  <PlusCircleIcon />
                  <span>{quickAction.title}</span>
                </Link>
              </SidebarMenuButton>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    size="icon"
                    className="size-11 shrink-0 border-border/70 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground group-data-[collapsible=icon]:hidden"
                    variant="outline"
                  >
                    <Link
                      href="/peta-publik"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Pantau Peta Publik Real-time (Buka di tab baru)"
                    >
                      <Radio className="size-4 text-muted-foreground/80 transition-colors group-hover:text-foreground" />
                      <span className="sr-only">Pantau Peta Publik Real-time</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-sans text-xs">
                  Pantau Peta Publik Real-time (Tab Baru)
                </TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      {filteredGroups.map((group) => (
        <SidebarGroup key={group.id} className="py-1.5">
          {group.label && (
            <SidebarGroupLabel className="h-7 px-2.5 text-[11px] font-semibold text-sidebar-foreground/65 group-data-[collapsible=icon]:pointer-events-none">
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  isItemActive={isItemActive}
                  isSubItemActive={isSubItemActive}
                  isSubmenuOpen={isSubmenuOpen}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function NavItem({
  item,
  isItemActive,
  isSubItemActive,
  isSubmenuOpen,
}: NavItemProps) {
  const { state, isMobile } = useSidebar();
  const isCollapsedDesktop = state === "collapsed" && !isMobile;

  if (!hasSubItems(item)) {
    return (
      <NavLinkItem
        item={item}
        isActive={isItemActive(item)}
        showIconFallback={isCollapsedDesktop}
      />
    );
  }

  if (isCollapsedDesktop) {
    return (
      <NavDropdownItem
        item={item}
        isActive={isItemActive(item)}
        isSubItemActive={isSubItemActive}
      />
    );
  }

  return (
    <NavCollapsibleItem
      item={item}
      isActive={isItemActive(item)}
      defaultOpen={isSubmenuOpen(item)}
      isSubItemActive={isSubItemActive}
    />
  );
}

function NavLinkItem({ item, isActive, showIconFallback }: NavLinkItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        aria-disabled={item.disabled}
        tooltip={item.title}
        isActive={isActive}
        className="relative h-10.5 gap-3 rounded-lg px-3 text-xs font-normal text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/90 data-[active=true]:font-medium data-[active=true]:text-foreground before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-[3px] before:rounded-r-full before:bg-primary before:opacity-0 data-[active=true]:before:opacity-100 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center"
      >
        <Link
          href={item.url}
          target={item.newTab ? "_blank" : undefined}
          rel={item.newTab ? "noreferrer" : undefined}
          aria-current={isActive ? "page" : undefined}
          className="flex items-center w-full"
        >
          <NavLinkIcon item={item} showFallback={showIconFallback} />
          <span className="truncate">{item.title}</span>
        </Link>
      </SidebarMenuButton>
      <NavItemBadge badge={item.badge} />
    </SidebarMenuItem>
  );
}

function NavLinkIcon({ item, showFallback }: NavLinkIconProps) {
  const Icon = item.icon;

  if (Icon) {
    return (
      <Icon className="size-4 shrink-0 text-muted-foreground/90 group-data-[active=true]/menu-button:text-foreground" />
    );
  }

  if (showFallback) {
    return <CollapsedIconFallback title={item.title} />;
  }

  return null;
}

function NavDropdownItem({
  item,
  isActive,
  isSubItemActive,
}: NavDropdownItemProps) {
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={isActive}
            disabled={item.disabled}
            className="relative size-8 transition-colors data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold"
          >
            {Icon ? <Icon /> : <CollapsedIconFallback title={item.title} />}
            <span>{item.title}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={12}
          className="w-48"
        >
          <DropdownMenuGroup>
            {item.subItems.map((subItem) => {
              const SubIcon = subItem.icon;

              return (
                <DropdownMenuItem
                  key={subItem.id}
                  asChild
                  disabled={subItem.disabled}
                >
                  <Link
                    href={subItem.url}
                    target={subItem.newTab ? "_blank" : undefined}
                    rel={subItem.newTab ? "noreferrer" : undefined}
                    aria-current={
                      isSubItemActive(subItem.url) ? "page" : undefined
                    }
                    className="flex items-center gap-2"
                  >
                    {SubIcon && <SubIcon />}
                    <span>{subItem.title}</span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

function NavCollapsibleItem({
  item,
  isActive,
  defaultOpen,
  isSubItemActive,
}: NavCollapsibleItemProps) {
  const Icon = item.icon;

  return (
    <Collapsible
      asChild
      defaultOpen={defaultOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={isActive}
            disabled={item.disabled}
            className="relative h-11 gap-2.5 px-2.5 transition-colors after:absolute after:inset-y-2 after:left-0 after:w-px after:rounded-full data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:after:bg-primary"
          >
            {Icon && <Icon />}
            <span>{item.title}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <NavItemBadge badge={item.badge} />

        <CollapsibleContent>
          <SidebarMenuSub>
            {item.subItems.map((subItem) => {
              const SubIcon = subItem.icon;

              return (
                <SidebarMenuSubItem key={subItem.id}>
                  <SidebarMenuSubButton
                    asChild
                    aria-disabled={subItem.disabled}
                    isActive={isSubItemActive(subItem.url)}
                    className="h-10 transition-colors data-[active=true]:font-semibold"
                  >
                    <Link
                      href={subItem.url}
                      target={subItem.newTab ? "_blank" : undefined}
                      rel={subItem.newTab ? "noreferrer" : undefined}
                    >
                      {SubIcon && <SubIcon />}
                      <span>{subItem.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function NavItemBadge({ badge }: { badge?: NavBadge }) {
  if (!badge) {
    return null;
  }

  const label =
    badge === "new"
      ? "New"
      : badge === "live"
        ? "Live"
        : badge === "darurat"
          ? "Darurat"
          : "Segera";

  return (
    <SidebarMenuBadge
      className={cn(
        "right-2.5 h-5 min-w-0 rounded-md border px-1.5 py-0 text-[10px] font-sans font-medium",
        badge === "new" &&
          "border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/40 dark:text-emerald-400",
        badge === "live" &&
          "border-blue-600/40 bg-blue-500/10 text-blue-700 dark:border-blue-400/40 dark:text-blue-400",
        badge === "darurat" &&
          "border-red-600/40 bg-red-500/10 text-red-700 dark:border-red-400/40 dark:text-red-400",
        badge === "soon" && "border-muted-foreground/40 text-muted-foreground",
      )}
    >
      {label}
    </SidebarMenuBadge>
  );
}
