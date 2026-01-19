import { useFloatingChat } from "@/contexts/FloatingChatContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { useWhatsAppConversations, useWhatsAppRealtimeConversations } from "@/hooks/use-whatsapp-conversations";
import { useWhatsAppSessions } from "@/hooks/use-whatsapp-sessions";
import { useLocation } from "react-router-dom";

export function FloatingChatButton() {
  const { state, toggleChat } = useFloatingChat();
  const { data: sessions } = useWhatsAppSessions();
  const { data: conversations } = useWhatsAppConversations();
  const location = useLocation();
  
  // Enable realtime para manter badge atualizado
  useWhatsAppRealtimeConversations();

  // Verificar se tem sessão conectada
  const hasConnectedSession = sessions?.some((s) => s.status === "connected");
  
  // Contar mensagens não lidas
  const unreadCount = conversations?.reduce((acc, c) => acc + (c.unread_count || 0), 0) || 0;

  // Não mostrar botão se chat está aberto, não tem sessão, ou está na página de conversas
  const isOnConversationsPage = location.pathname === "/crm/conversas";
  if (state.isOpen || !hasConnectedSession || isOnConversationsPage) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={toggleChat}
        size="lg"
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>
    </div>
  );
}
