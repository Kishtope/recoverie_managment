import { AppSidebar } from "@/features/navigation/_components/app-sidebar";
import { AuthGate } from "@/features/auth/_components/auth-gate";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// Signed-in shell: sidebar on the left, page content on the right (min-w-0 keeps wide tables from scrolling the page).
// AuthGate shows the loading animation until the current user has loaded.
const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <AuthGate>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="flex h-14 items-center gap-2 px-4">
          <SidebarTrigger />
        </header>
        <div className="flex min-w-0 flex-1 flex-col p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  </AuthGate>
);

export default AppLayout;
