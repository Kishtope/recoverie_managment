import { PendingCallBanner } from "@/features/calls/_components/pending-call-banner";
import { AppHeader } from "@/features/navigation/_components/app-header";
import { AppSidebar } from "@/features/navigation/_components/app-sidebar";
import { AuthGate } from "@/features/auth/_components/auth-gate";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

// Signed-in shell: sidebar on the left, page content on the right (min-w-0 keeps wide tables from scrolling the page).
// AuthGate shows the loading animation until the current user has loaded.
const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <AuthGate>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <AppHeader />
        <PendingCallBanner />
        <div className="flex min-w-0 flex-1 flex-col p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  </AuthGate>
);

export default AppLayout;
