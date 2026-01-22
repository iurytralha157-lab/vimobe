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
    <div className="min-h-screen flex flex-col w-full bg-background">
      {/* Header fixo no topo com logo */}
      <AppHeader title={title} />
      
      {/* Área de conteúdo com sidebar flutuante */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar flutuante */}
        {!isMobile && <AppSidebar />}
        
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