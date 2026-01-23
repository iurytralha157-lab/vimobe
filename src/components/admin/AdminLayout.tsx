import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminMobileSidebar } from './AdminMobileSidebar';
import { AdminHeader } from './AdminHeader';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop sidebar */}
      {!isMobile && <AdminSidebar />}
      
      {/* Spacer for fixed sidebar - only on desktop */}
      {!isMobile && <div className="w-64 flex-shrink-0 transition-all duration-300" />}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header with hamburger */}
        {isMobile && (
          <div className="h-14 border-b border-border flex items-center px-4 bg-background">
            <AdminMobileSidebar />
          </div>
        )}
        
        {/* Main header with title and actions */}
        <AdminHeader title={title} />
        
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
