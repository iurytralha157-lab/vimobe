import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { FloatingChatProvider } from '@/contexts/FloatingChatContext';
import { FloatingChat } from '@/components/chat/FloatingChat';
import { FloatingChatButton } from '@/components/chat/FloatingChatButton';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

function AppLayoutContent({ children, title }: AppLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="h-screen flex w-full bg-background overflow-hidden">
      {/* Desktop sidebar fixa */}
      {!isMobile && (
        <div className="flex-shrink-0">
          <AppSidebar />
        </div>
      )}
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header com título e ações */}
        <AppHeader title={title} />
        
        {/* Conteúdo da página */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
      
      {/* Floating WhatsApp Chat */}
      <FloatingChatButton />
      <FloatingChat />
      
      {/* PWA Install Prompt */}
      <InstallPrompt />
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