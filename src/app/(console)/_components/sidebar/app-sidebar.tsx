"use client";

import Link from "next/link";
import Image from "next/image";
import { useShallow } from "zustand/react/shallow";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { rootUser } from "@/data/users";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import type { AppRole } from "@/lib/auth-types";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string;
    email: string;
    role?: string;
    appRole?: AppRole;
    avatar?: string | null;
  } | null;
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.values.sidebar_variant,
      sidebarCollapsible: s.values.sidebar_collapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader className="p-3 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-center">
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-10 px-2 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-1.5! group-data-[collapsible=icon]:justify-center hover:bg-sidebar-accent"
            >
              <Link
                prefetch={false}
                href="/dashboard"
                className="flex items-center"
              >
                <div className="relative h-8 w-36 overflow-hidden group-data-[collapsible=icon]:hidden">
                  <Image
                    src="/brand/logo-siagakita.png"
                    alt="SiagaKita"
                    width={1187}
                    height={408}
                    priority
                    className="h-full w-full object-contain object-left dark:invert dark:brightness-125"
                  />
                </div>

                <div className="relative hidden size-5 shrink-0 items-center justify-center overflow-hidden group-data-[collapsible=icon]:flex">
                  <Image
                    src="/brand/logo-siagakita-icon.png"
                    alt="SiagaKita Emblem"
                    width={20}
                    height={20}
                    priority
                    className="h-full w-full object-contain dark:invert dark:brightness-125"
                  />
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} role={user?.appRole} />
      </SidebarContent>
      <SidebarFooter className="p-2">
        <NavUser user={user ?? rootUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
