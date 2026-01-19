import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AppHeader } from '@/components/layout/AppHeader';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar />
      {/* Spacer to offset fixed sidebar */}
      <div className="w-64 flex-shrink-0 transition-all duration-300" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader title={title} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
