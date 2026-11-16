"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenIcon, LayoutDashboardIcon, PackageIcon, PenLineIcon, UsersIcon } from "lucide-react";
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
import { NavUser } from "./nav-user";

// Every page reachable from the sidebar, in display order.
const NAV_ITEMS = [
  { title: "Dashboard", href: "/", icon: LayoutDashboardIcon },
  { title: "Visitors", href: "/visitors", icon: UsersIcon },
  { title: "Parcels", href: "/parcels", icon: PackageIcon },
  { title: "Stationery", href: "/stationery", icon: PenLineIcon },
  { title: "Library", href: "/library", icon: BookOpenIcon },
];

/**
 * @component AppSidebar
 * @description App navigation: brand logo + name in the header, all page links in the content, and the user menu in the footer.
 * Collapses to an icon rail (logo mark only) on desktop.
 */
export const AppSidebar = () => {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />} className="hover:bg-transparent">
              <Image src="/brand/mark-dark.svg" alt="" width={32} height={32} unoptimized className="size-8 shrink-0" />
              <div className="grid flex-1 text-left leading-tight"><span className="font-heading text-lg">KishtoPe</span><span className="truncate text-xs text-sidebar-foreground/70">Office Management</span></div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ title, href, icon: Icon }) => (
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
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
