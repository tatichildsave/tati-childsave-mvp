import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AcademyHeader } from "./AcademyHeader";
import { AcademySidebar } from "./AcademySidebar";

export function AcademyShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AcademyHeader />
      <div className="flex gap-6">
        {/* Sidebar - hidden on mobile, shown on tablet+ */}
        <aside className="hidden w-48 border-r border-border md:block">
          <div className="sticky top-0 p-4">
            <AcademySidebar />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 px-4 py-6 md:px-6">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
