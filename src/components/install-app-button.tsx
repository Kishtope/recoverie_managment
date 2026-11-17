"use client";

import { DownloadIcon, ShareIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

/**
 * @component InstallAppButton
 * @description "Install app" entry for the sidebar footer. Where the browser can install the app it runs the browser's own install prompt;
 * on iPhone, which has none, it opens a short how-to (Share, then Add to Home Screen). Renders nothing when the app is already installed
 * or the browser cannot install it.
 */
export const InstallAppButton = () => {
  const { canInstall, showIosHint, install } = useInstallPrompt();

  if (canInstall) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Install app" onClick={() => void install()}>
            <DownloadIcon />
            <span>Install app</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }
  if (showIosHint) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Dialog>
            <DialogTrigger render={<SidebarMenuButton tooltip="Install app" />}>
              <DownloadIcon />
              <span>Install app</span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Install on your iPhone</DialogTitle>
                <DialogDescription>Open this page in Safari, then tap the Share button and choose Add to Home Screen.</DialogDescription>
              </DialogHeader>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShareIcon className="size-4 shrink-0" />
                The share button is the square with an arrow, at the bottom of Safari.
              </p>
            </DialogContent>
          </Dialog>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }
  return null;
};
