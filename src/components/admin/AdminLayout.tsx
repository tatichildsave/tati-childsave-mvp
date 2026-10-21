/**
 * AdminLayout
 *
 * Premium two-column layout for TATI ChildSave admin workspace.
 * - Desktop: Sidebar + main content area
 * - Tablet/Mobile: Drawer navigation + full-width content
 *
 * Responsive, accessible, with professional typography and spacing.
 */

import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { tatiTheme } from '@/lib/theme';
import { AdminSidebar } from './AdminSidebar';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { Menu, X } from 'lucide-react';

export interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function AdminLayout({
  children,
  title,
  description,
  actions,
}: AdminLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-64 lg:border-r lg:border-border lg:display">
        <div className="flex flex-col h-full bg-card">
          <AdminSidebar />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:ml-64 flex flex-col min-h-screen">
        {/* Header with Mobile Menu Trigger */}
        <header className="sticky top-0 z-40 border-b border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            {/* Mobile Menu Button */}
            <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DrawerTrigger asChild>
                <button
                  className={cn(
                    'lg:hidden flex items-center justify-center h-10 w-10 rounded-lg bg-secondary hover:bg-muted transition-colors',
                    tatiTheme.focusRing,
                  )}
                  aria-label="Open navigation menu"
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </button>
              </DrawerTrigger>
              <DrawerContent className="bg-card">
                <div className="px-4 py-6">
                  <AdminSidebar />
                </div>
              </DrawerContent>
            </Drawer>

            {/* Page Title Area (Desktop Only) */}
            <div className="hidden sm:flex sm:flex-1 sm:ml-4">
              {title && (
                <div className="flex flex-col">
                  <h1 className="text-lg font-extrabold text-foreground">{title}</h1>
                  {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {actions && <div className="flex gap-2 ml-4">{actions}</div>}
          </div>

          {/* Mobile Page Title */}
          <div className="sm:hidden px-4 pb-3 border-t border-border">
            {title && (
              <div className="flex flex-col">
                <h1 className="text-base font-extrabold text-foreground">{title}</h1>
                {description && (
                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
