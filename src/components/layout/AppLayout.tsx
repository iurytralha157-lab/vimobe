import { ReactNode, useEffect } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { FloatingChatProvider } from '@/contexts/FloatingChatContext';
import { FloatingChat } from '@/components/chat/FloatingChat';
import { FloatingChatButton } from '@/components/chat/FloatingChatButton';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { useWhatsAppHealthMonitor } from '@/hooks/use-whatsapp-health-monitor';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { usePhoneReminder } from '@/hooks/use-phone-reminder';
import { useSystemSettings } from '@/hooks/use-system-settings';
import { useAuth } from '@/contexts/AuthContext';
import { Wrench } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  disableMainScroll?: boolean;
}

function MaintenanceBanner() {
  const { data: settings } = useSystemSettings();
  const { profile, isSuperAdmin } = useAuth();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin' || isSuperAdmin;

  if (!settings?.maintenance_mode || isAdmin) return null;

  const message = settings.maintenance_message || 'O sistema está em manutenção. Por favor, aguarde.';

  return (
    <div className="w-full bg-amber-500 text-white py-2.5 px-4 flex items-center justify-center gap-3 shadow-md flex-shrink-0">
      <Wrench className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium text-center">{message}</span>
    </div>
  );
}

function AppLayoutContent({ children, title, disableMainScroll = false }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const { data: settings } = useSystemSettings();

  // Dynamic PWA Manifest Update
  useEffect(() => {
    if (settings?.pwa_icon_url) {
      // Update link icons for iOS/Apple Touch
      const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (appleIcon) {
        appleIcon.setAttribute('href', settings.pwa_icon_url);
      } else {
        const newAppleIcon = document.createElement('link');
        newAppleIcon.rel = 'apple-touch-icon';
        newAppleIcon.href = settings.pwa_icon_url;
        document.head.appendChild(newAppleIcon);
      }

      // We can't easily update the manifest.json src dynamically in all browsers,
      // but most modern browsers will respect the favicon/apple-touch-icon 
      // when adding to home screen if the manifest is not yet cached or if it's updated.
      // We also update common favicon tags
      const iconTags = document.querySelectorAll('link[rel="icon"]');
      iconTags.forEach(tag => {
        tag.setAttribute('href', settings.pwa_icon_url);
      });
    }
  }, [settings?.pwa_icon_url]);
  
  // Start WhatsApp session health monitoring
  useWhatsAppHealthMonitor();
  
  // Initialize native push notifications (only in Capacitor)
  usePushNotifications();

  // Daily reminder for users without phone number
  usePhoneReminder();

  return (
    <div className="h-screen flex flex-col w-full bg-background overflow-hidden pt-[env(safe-area-inset-top)]">
      {/* Maintenance Banner — non-dismissible, shown before header */}
      <MaintenanceBanner />

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar fixa */}
        {!isMobile && (
          <div className="flex-shrink-0">
            <AppSidebar />
          </div>
        )}
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Header com título e ações */}
          <AppHeader title={title} />
          
          {/* Conteúdo da página */}
          <main className={`flex-1 min-h-0 ${disableMainScroll ? 'overflow-hidden relative' : 'overflow-y-auto overflow-x-hidden'} px-4 md:px-6 py-3 md:py-4 ${isMobile ? 'pb-20' : ''}`}>
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav />}
      
      {/* Floating WhatsApp Chat */}
      <FloatingChatButton />
      <FloatingChat />
      
      {/* PWA Prompts */}
      <InstallPrompt />
    </div>
  );
}

export function AppLayout({ children, title, disableMainScroll = false }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <FloatingChatProvider>
        <AppLayoutContent title={title} disableMainScroll={disableMainScroll}>
          {children}
        </AppLayoutContent>
      </FloatingChatProvider>
    </SidebarProvider>
  );
}
