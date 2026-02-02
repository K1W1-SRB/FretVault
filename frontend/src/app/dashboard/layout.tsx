import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SelectedWorkspaceProvider } from "@/hooks/selected-workspace-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <SelectedWorkspaceProvider>
        <AppSidebar />
        <SidebarInset>
          {/* Top bar (optional) */}
          <header className="sticky top-0 z-10 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
            <div className="flex h-14 items-center px-4">
              <div className="text-sm text-muted-foreground">Personal</div>
            </div>
            <Separator />
          </header>

          {/* Main content area */}
          <main className="p-6">{children}</main>
        </SidebarInset>
      </SelectedWorkspaceProvider>
    </SidebarProvider>
  );
}
