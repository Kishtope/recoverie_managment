"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDownIcon, LogOutIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useMe } from "@/features/auth/hooks/use-me";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";

// Extracts up to two initials from a full name for the avatar fallback.
const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

// Avatar plus two-line name/email block, reused by the trigger and the menu header.
const UserInfo = ({ name, email }: { name: string; email: string }) => (
  <>
    <Avatar className="size-8 rounded-lg">
      <AvatarFallback className="rounded-lg bg-sidebar-foreground font-semibold text-sidebar">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
    <div className="grid flex-1 text-left text-sm leading-tight">
      <span className="truncate font-medium">{name}</span>
      <span className="truncate text-xs opacity-70">{email}</span>
    </div>
  </>
);

/**
 * @component NavUser
 * @description Sidebar footer: the signed-in user's avatar, name and email, with a dropdown holding "Sign out".
 * Signing out closes the menu at once and covers the screen with a loader until the redirect happens.
 */
export const NavUser = () => {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { data: user, isPending } = useMe();
  const { mutate: signOut, isPending: isSigningOut } = useSignOut();

  if (isPending || !user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Skeleton className="h-12 w-full" />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
              <UserInfo name={user.name} email={user.email} />
              <ChevronsUpDownIcon className="ml-auto" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5">
                    <UserInfo name={user.name} email={user.email} />
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  disabled={isSigningOut}
                  onClick={() => signOut(undefined, { onSuccess: () => router.replace("/sign-in") })}
                >
                  <LogOutIcon />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Full-screen blocker so nothing can be clicked while the session ends. */}
      {isSigningOut && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm"
        >
          <Spinner className="size-8" />
          <p className="font-heading text-lg">Signing you out…</p>
        </div>
      )}
    </>
  );
};
