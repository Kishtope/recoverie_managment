"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseIcon, CalendarClockIcon, GaugeIcon, RocketIcon, LayoutDashboardIcon, PhoneIcon, SettingsIcon, TrendingUpIcon, UploadIcon, UsersIcon } from "lucide-react";
import type { Role } from "@/generated/prisma/client";
import { useMe } from "@/features/auth/hooks/use-me";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { InstallAppButton } from "@/components/install-app-button";
import { NavUser } from "./nav-user";

// Pages reachable from the sidebar, in display order; `roles` omitted = everyone. Display only: the API enforces access.
// `agentTitle` is the label an agent sees instead of `title` (their cases are all their own).
type NavItem = { title: string; agentTitle?: string; href: string; icon: typeof UsersIcon; roles?: Role[] };
const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboardIcon },
  { title: "Cases", agentTitle: "My cases", href: "/cases", icon: BriefcaseIcon, roles: ["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT"] },
  { title: "Follow-ups", href: "/follow-ups", icon: CalendarClockIcon, roles: ["AGENT"] },
  { title: "Calls", agentTitle: "My calls", href: "/calls", icon: PhoneIcon, roles: ["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT"] },
  { title: "Recovery", href: "/recovery", icon: TrendingUpIcon, roles: ["ADMIN", "MANAGER", "AGENCY_OWNER"] },
  { title: "Performance", href: "/performance", icon: GaugeIcon, roles: ["ADMIN", "MANAGER", "AGENCY_OWNER"] },
  { title: "Imports", href: "/imports", icon: UploadIcon, roles: ["ADMIN"] },
  { title: "Team", href: "/team", icon: UsersIcon, roles: ["ADMIN", "MANAGER", "AGENCY_OWNER"] },
  { title: "Cut-over", href: "/cutover", icon: RocketIcon, roles: ["ADMIN"] },
  { title: "Settings", href: "/settings", icon: SettingsIcon, roles: ["ADMIN"] },
];

/**
 * @component AppSidebar
 * @description App navigation: brand logo + name in the header, all page links in the content, and the user menu in the footer.
 * Collapses to an icon rail (logo mark only) on desktop.
 */
export const AppSidebar = () => {
  const pathname = usePathname();
  const { data: me } = useMe();
  const items = NAV_ITEMS.filter((item) => !item.roles || (me && item.roles.includes(me.role)));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />} className="hover:bg-transparent">
              <Image src="/brand/mark-dark.svg" alt="" width={32} height={32} unoptimized className="size-8 shrink-0" />
              <div className="grid flex-1 text-left leading-tight"><span className="font-heading text-lg">KishtoPe</span><span className="truncate text-xs text-sidebar-foreground/70">Recovery</span></div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(({ title: defaultTitle, agentTitle, href, icon: Icon }) => {
                const title = me?.role === "AGENT" && agentTitle ? agentTitle : defaultTitle;
                return (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    tooltip={title}
                    className="rounded-full data-active:bg-sidebar-primary data-active:font-semibold data-active:text-sidebar-primary-foreground data-active:hover:bg-sidebar-primary data-active:hover:text-sidebar-primary-foreground"
                    isActive={href === "/" ? pathname === "/" : pathname.startsWith(href)}
                    render={<Link href={href} />}
                  >
                    <Icon />
                    <span>{title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <InstallAppButton />
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
