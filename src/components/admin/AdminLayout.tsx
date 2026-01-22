import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminMobileSidebar } from './AdminMobileSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop sidebar */}
      {!isMobile && <AdminSidebar />}
      
      {/* Spacer for fixed sidebar - only on desktop */}
      {!isMobile && <div className="w-64 flex-shrink-0 transition-all duration-300" />}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        {isMobile && (
          <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background">
            <AdminMobileSidebar />
            <h1 className="text-lg font-semibold truncate flex-1 text-center">{title || 'Super Admin'}</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </header>
        )}
        
        {/* Desktop header */}
        {!isMobile && (
          <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background">
            <h1 className="text-xl font-semibold">{title || 'Super Admin'}</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </header>
        )}
        
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
