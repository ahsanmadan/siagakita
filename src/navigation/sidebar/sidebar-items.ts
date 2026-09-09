import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  FileText,
  Forklift,
  Globe,
  HeartPulse,
	History,
	Home,
	Kanban,
	LayoutDashboard,
	UserCog,
	type LucideIcon,
	ShieldCheck,
	Users,
} from "lucide-react";

export type NavBadge = "new" | "soon" | "live" | "darurat";
export type NavItemId = string;

export interface NavSubItem {
  id: NavItemId;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: NavItemId;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Pusat Kendali Krisis",
    items: [
      {
        id: "dashboard",
        title: "Ringkasan Situasi",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        id: "events",
        title: "Kejadian Bencana",
        url: "/kejadian",
        icon: AlertTriangle,
        badge: "darurat",
      },
      {
        id: "shelters",
        title: "Posko & Pengungsi",
        url: "/posko",
        icon: Home,
      },
      {
        id: "logistics",
        title: "Logistik & Armada",
        url: "/logistik",
        icon: Forklift,
      },
      {
        id: "reports",
        title: "Antrean Laporan",
        url: "/laporan",
        icon: FileText,
        badge: "new",
      },
    ],
  },
  {
    id: 2,
    label: "Operasional & GIS",
    items: [
      {
        id: "publicMap",
        title: "Peta Publik Real-time",
        url: "/peta-publik",
        icon: Globe,
        newTab: true,
        badge: "live",
      },
			{
				id: "audit",
				title: "Jejak Audit & Keputusan",
				url: "/audit-log",
				icon: History,
			},
			{
				id: "accounts",
				title: "Akun Demo",
				url: "/akun",
				icon: UserCog,
			},
		],
	},
];
