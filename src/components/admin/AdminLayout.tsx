import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { ImpersonateBanner } from './ImpersonateBanner';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <ImpersonateBanner />
      <AdminSidebar />
      {/* Spacer to offset fixed sidebar */}
      <div className="w-64 flex-shrink-0 transition-all duration-300" />
      <div className="flex-1 flex flex-col overflow-hidden">
        {title && (
          <header className="h-16 border-b border-border flex items-center px-6">
            <h1 className="text-xl font-semibold">{title}</h1>
          </header>
        )}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
