import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { FloatingChatProvider } from '@/contexts/FloatingChatContext';
import { FloatingChat } from '@/components/chat/FloatingChat';
import { FloatingChatButton } from '@/components/chat/FloatingChatButton';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

function AppLayoutContent({ children, title }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop sidebar */}
      {!isMobile && <AppSidebar />}
      {/* Spacer to offset fixed sidebar - only on desktop */}
      {!isMobile && (
        <div 
          className="flex-shrink-0 transition-all duration-300" 
          style={{ width: collapsed ? 64 : 256 }}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader title={title} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
      
      {/* Floating WhatsApp Chat */}
      <FloatingChatButton />
      <FloatingChat />
    </div>
  );
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <FloatingChatProvider>
        <AppLayoutContent title={title}>{children}</AppLayoutContent>
      </FloatingChatProvider>
    </SidebarProvider>
  );
}